"use client";

import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useSession } from "@/lib/auth/session-context";
import { isOrderInFlight } from "@/lib/status";
import {
  contractApi,
  healthApi,
  issuerApi,
  type KycListFilter,
  kycApi,
  orderApi,
  platformApi,
  realEstateApi,
} from "./endpoints";
import type {
  IssuanceOrder,
  IssuerPatchRequest,
  IssuerWriteRequest,
  RealEstatePatchRequest,
  RealEstateWriteRequest,
} from "./types";

export const queryKeys = {
  health: ["health"] as const,
  me: ["me"] as const,
  realEstates: ["real-estates"] as const,
  realEstate: (id: number) => ["real-estates", id] as const,
  issuers: ["issuers"] as const,
  issuer: (id: number) => ["issuers", id] as const,
  orders: ["orders"] as const,
  order: (ref: string) => ["orders", ref] as const,
  kycList: (filter: KycListFilter) => ["kyc", "list", filter] as const,
  kyc: (id: number) => ["kyc", id] as const,
  kycAll: ["kyc"] as const,
  trexSuite: (salt?: string) => ["trex-suite", salt ?? ""] as const,
  tokenInfos: (address: string) => ["token-infos", address] as const,
};

export function useHealth() {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: healthApi.get,
    refetchInterval: 30_000,
    retry: false,
  });
}

// --- Real estate -----------------------------------------------------------

export function useRealEstates() {
  const { role } = useSession();
  return useQuery({
    // Staff receive drafts too, so the cache is split per audience.
    queryKey: [...queryKeys.realEstates, role ?? "anonymous"],
    queryFn: realEstateApi.list,
  });
}

export function useRealEstate(id: number | undefined) {
  return useQuery({
    queryKey: queryKeys.realEstate(id ?? 0),
    queryFn: () => realEstateApi.get(id as number),
    enabled: typeof id === "number" && id > 0,
  });
}

function invalidateRealEstates(qc: QueryClient, id?: number) {
  qc.invalidateQueries({ queryKey: queryKeys.realEstates });
  if (id) qc.invalidateQueries({ queryKey: queryKeys.realEstate(id) });
  qc.invalidateQueries({ queryKey: queryKeys.issuers });
}

export function useCreateRealEstate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: RealEstateWriteRequest) => realEstateApi.create(body),
    onSuccess: (re) => invalidateRealEstates(qc, re.id),
  });
}

export function useUpdateRealEstate(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: RealEstatePatchRequest) =>
      realEstateApi.update(id, body),
    onSuccess: (re) => {
      qc.setQueryData(queryKeys.realEstate(id), re);
      invalidateRealEstates(qc, id);
    },
  });
}

export function useDeleteRealEstate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => realEstateApi.remove(id),
    onSuccess: (_, id) => {
      qc.removeQueries({ queryKey: queryKeys.realEstate(id) });
      invalidateRealEstates(qc);
    },
  });
}

export function usePublishRealEstate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => realEstateApi.publish(id),
    onSuccess: (re, id) => {
      qc.setQueryData(queryKeys.realEstate(id), re);
      invalidateRealEstates(qc, id);
    },
  });
}

export function useOpenFundraising() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => realEstateApi.openFundraising(id),
    onSuccess: (re, id) => {
      qc.setQueryData(queryKeys.realEstate(id), re);
      invalidateRealEstates(qc, id);
    },
  });
}

// --- Issuers ---------------------------------------------------------------

export function useIssuers(enabled = true) {
  return useQuery({
    queryKey: queryKeys.issuers,
    queryFn: issuerApi.list,
    enabled,
  });
}

export function useIssuer(id: number | undefined) {
  return useQuery({
    queryKey: queryKeys.issuer(id ?? 0),
    queryFn: () => issuerApi.get(id as number),
    enabled: typeof id === "number" && id > 0,
  });
}

export function useCreateIssuer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: IssuerWriteRequest) => issuerApi.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.issuers }),
  });
}

export function useUpdateIssuer(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: IssuerPatchRequest) => issuerApi.update(id, body),
    onSuccess: (issuer) => {
      qc.setQueryData(queryKeys.issuer(id), issuer);
      qc.invalidateQueries({ queryKey: queryKeys.issuers });
    },
  });
}

export function useDeleteIssuer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => issuerApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.issuers }),
  });
}

// --- Orders ----------------------------------------------------------------

/** Lists orders; polls while one of them is still moving on its own. */
export function useOrders(enabled = true) {
  return useQuery({
    queryKey: queryKeys.orders,
    queryFn: orderApi.list,
    enabled,
    refetchInterval: (q) =>
      q.state.data?.some((o) => isOrderInFlight(o.statusCode)) ? 4000 : false,
  });
}

/** Fetches one order and polls it until it reaches a stable status. */
export function useOrder(orderRef: string | undefined) {
  return useQuery({
    queryKey: queryKeys.order(orderRef ?? ""),
    queryFn: () => orderApi.get(orderRef as string),
    enabled: !!orderRef,
    refetchInterval: (q) =>
      q.state.data && isOrderInFlight(q.state.data.statusCode) ? 2500 : false,
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: {
      realEstateId: number;
      quantity: number;
      idempotencyKey: string;
    }) =>
      orderApi.create(
        { realEstateId: v.realEstateId, quantity: v.quantity },
        v.idempotencyKey,
      ),
    onSuccess: (order) => {
      qc.setQueryData(queryKeys.order(order.orderRef), order);
      qc.invalidateQueries({ queryKey: queryKeys.orders });
      invalidateRealEstates(qc, order.realEstateId);
    },
  });
}

export function useConfirmPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderRef: string) => orderApi.confirmPayment(orderRef),
    onSuccess: (order: IssuanceOrder) => {
      qc.setQueryData(queryKeys.order(order.orderRef), order);
      qc.invalidateQueries({ queryKey: queryKeys.orders });
      qc.invalidateQueries({ queryKey: queryKeys.order(order.orderRef) });
    },
  });
}

// --- KYC -------------------------------------------------------------------

export function useKycList(filter: KycListFilter = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.kycList(filter),
    queryFn: () => kycApi.list(filter),
    enabled,
  });
}

export function useKyc(id: number | undefined) {
  return useQuery({
    queryKey: queryKeys.kyc(id ?? 0),
    queryFn: () => kycApi.get(id as number),
    enabled: typeof id === "number" && id > 0,
  });
}

function useKycMutation<V>(fn: (v: V) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.kycAll });
      qc.invalidateQueries({ queryKey: queryKeys.me });
    },
  });
}

export function useSubmitKyc() {
  return useKycMutation(kycApi.submit);
}

export function useApproveKyc() {
  return useKycMutation((v: { id: number; expiresAt: string }) =>
    kycApi.approve(v.id, v.expiresAt),
  );
}

export function useRejectKyc() {
  return useKycMutation((v: { id: number; reason: string }) =>
    kycApi.reject(v.id, v.reason),
  );
}

export function useRevokeKyc() {
  return useKycMutation((v: { id: number; reason: string }) =>
    kycApi.revoke(v.id, v.reason),
  );
}

export function useSyncKycOnChain() {
  return useKycMutation((id: number) => kycApi.syncOnChain(id));
}

// --- Blockchain ------------------------------------------------------------

export function useTrexSuite(salt?: string) {
  return useQuery({
    queryKey: queryKeys.trexSuite(salt),
    queryFn: () => platformApi.getSuite(salt),
    retry: false,
  });
}

export function useTokenInfos(address: string | undefined) {
  return useQuery({
    queryKey: queryKeys.tokenInfos(address ?? ""),
    queryFn: () => contractApi.tokenInfos(address as string),
    enabled: !!address,
    retry: false,
  });
}
