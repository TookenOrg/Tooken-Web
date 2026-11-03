import { apiData, apiRequest, newIdempotencyKey } from "./client";
import type {
  AddClaimRequest,
  ApiMessage,
  BurnTokenRequest,
  ContractDetails,
  CreateIdentityRequest,
  CreateTokenRequest,
  HealthResponse,
  IdentityInfos,
  IssuanceOrder,
  Issuer,
  IssuerPatchRequest,
  IssuerWriteRequest,
  JwtToken,
  KycOnChainSyncResponse,
  KycVerification,
  KycVerificationRequest,
  RealEstate,
  RealEstatePatchRequest,
  RealEstateSummary,
  RealEstateWriteRequest,
  SignInRequest,
  SignUpRequest,
  TokenInfos,
  TrexSuiteInfos,
  TxHashName,
  User,
} from "./types";

const enc = encodeURIComponent;

export const healthApi = {
  get: () => apiRequest<HealthResponse>("/health", { auth: false }),
};

export const authApi = {
  signIn: (body: SignInRequest) =>
    apiData<JwtToken>("/auth/sign-in", { method: "POST", body, auth: false }),
  signUp: (body: SignUpRequest) =>
    apiData<JwtToken>("/auth/sign-up", { method: "POST", body, auth: false }),
  refresh: (refreshToken: string) =>
    apiData<JwtToken>("/auth/refresh", {
      method: "POST",
      body: { refreshToken },
      auth: false,
    }),
};

export const usersApi = {
  me: () => apiRequest<User>("/users/me"),
  addFavorite: (userId: number, realEstateId: number) =>
    apiRequest<ApiMessage>(
      `/users/${userId}/favorites/real-estates/${realEstateId}`,
      { method: "POST" },
    ),
  removeFavorite: (userId: number, realEstateId: number) =>
    apiRequest<ApiMessage>(
      `/users/${userId}/favorites/real-estates/${realEstateId}`,
      { method: "DELETE" },
    ),
};

export type KycListFilter = {
  status?: "submitted" | "approved";
  userId?: number;
};

export const kycApi = {
  submit: (body: KycVerificationRequest) =>
    apiRequest<ApiMessage>("/users/kyc/verifications", {
      method: "POST",
      body,
    }),
  list: (filter: KycListFilter = {}) =>
    apiRequest<KycVerification[] | null>("/users/kyc/verifications", {
      query: filter,
    }).then((rows) => rows ?? []),
  get: (id: number) =>
    apiRequest<KycVerification>(`/users/kyc/verifications/${id}`),
  approve: (id: number, expiresAt: string) =>
    apiRequest<KycVerification>(`/users/kyc/verifications/${id}/approve`, {
      method: "POST",
      body: { expires_at: expiresAt },
    }),
  reject: (id: number, reason: string) =>
    apiRequest<KycVerification>(`/users/kyc/verifications/${id}/reject`, {
      method: "POST",
      body: { reason },
    }),
  revoke: (id: number, reason: string) =>
    apiRequest<KycVerification>(`/users/kyc/verifications/${id}/revoke`, {
      method: "POST",
      body: { reason },
    }),
  syncOnChain: (id: number) =>
    apiRequest<KycOnChainSyncResponse>(
      `/users/kyc/verifications/${id}/sync-onchain`,
      { method: "POST" },
    ),
};

export const realEstateApi = {
  /** Public catalogue; staff also receive drafts. The backend sends null when empty. */
  list: () =>
    apiRequest<RealEstateSummary[] | null>("/assets/real-estates/active").then(
      (rows) => rows ?? [],
    ),
  get: (id: number) => apiRequest<RealEstate>(`/assets/real-estates/${id}`),
  create: (body: RealEstateWriteRequest) =>
    apiRequest<RealEstate>("/assets/real-estates", { method: "POST", body }),
  update: (id: number, body: RealEstatePatchRequest) =>
    apiRequest<RealEstate>(`/assets/real-estates/${id}`, {
      method: "PATCH",
      body,
    }),
  remove: (id: number) =>
    apiRequest<void>(`/assets/real-estates/${id}`, { method: "DELETE" }),
  publish: (id: number) =>
    apiRequest<RealEstate>(`/assets/real-estates/${id}/publish`, {
      method: "POST",
    }),
  openFundraising: (id: number) =>
    apiRequest<RealEstate>(`/assets/real-estates/${id}/open-fundraising`, {
      method: "POST",
    }),
};

export const issuerApi = {
  list: () =>
    apiRequest<Issuer[] | null>("/assets/issuers").then((rows) => rows ?? []),
  get: (id: number) => apiRequest<Issuer>(`/assets/issuers/${id}`),
  create: (body: IssuerWriteRequest) =>
    apiRequest<Issuer>("/assets/issuers", { method: "POST", body }),
  update: (id: number, body: IssuerPatchRequest) =>
    apiRequest<Issuer>(`/assets/issuers/${id}`, { method: "PATCH", body }),
  remove: (id: number) =>
    apiRequest<void>(`/assets/issuers/${id}`, { method: "DELETE" }),
};

export const orderApi = {
  /**
   * Places an order. Pass the same key to retry the same intent safely: the
   * backend replays the original order instead of creating a second one.
   */
  create: (
    body: { realEstateId: number; quantity: number },
    idempotencyKey: string = newIdempotencyKey(),
  ) =>
    apiData<IssuanceOrder>("/assets/real-estate/issuance/orders", {
      method: "POST",
      body,
      headers: { "Idempotency-Key": idempotencyKey },
    }),
  list: () =>
    apiData<IssuanceOrder[] | null>("/assets/real-estate/issuance/orders").then(
      (rows) => rows ?? [],
    ),
  get: (orderRef: string) =>
    apiRequest<IssuanceOrder>(
      `/assets/real-estate/issuance/orders/${enc(orderRef)}`,
    ),
  confirmPayment: (orderRef: string) =>
    apiData<IssuanceOrder>(
      `/assets/real-estate/issuance/orders/${enc(orderRef)}/confirm-payment`,
      { method: "POST" },
    ),
};

export const platformApi = {
  deployImplementations: () =>
    apiRequest<ApiMessage>("/trex/init/implementations", { method: "POST" }),
  deployIdentityFactory: () =>
    apiData<ContractDetails>("/trex/init/contract/factory/identity", {
      method: "POST",
    }),
  configureAuthority: () =>
    apiData<TxHashName>("/trex/init/authority/configure", { method: "POST" }),
  deployTrexFactory: () =>
    apiRequest<ApiMessage>("/trex/init/contract/factory/trexFactory", {
      method: "POST",
    }),
  deploySuite: () =>
    apiRequest<ApiMessage>("/trex/init/suite/deploy", { method: "POST" }),
  /** The current backend may answer with a bare message: callers must cope with missing fields. */
  getSuite: (salt?: string) =>
    apiRequest<Partial<TrexSuiteInfos> & { message?: string; data?: unknown }>(
      "/trex/suite",
      { query: { salt } },
    ),
};

export const contractApi = {
  createIdentity: (body: CreateIdentityRequest) =>
    apiData<IdentityInfos>("/contract/identity", { method: "POST", body }),
  addClaim: (body: AddClaimRequest) =>
    apiData<TxHashName>("/contract/identity/claims/add", {
      method: "POST",
      body,
    }),
  createToken: (body: CreateTokenRequest) =>
    apiData<TokenInfos>("/contract/token", { method: "POST", body }),
  /** The backend may answer with an empty `data`: callers must cope with it. */
  tokenInfos: (tokenAddress: string) =>
    apiData<TokenInfos | "" | null>(
      `/contract/token/${enc(tokenAddress)}/infos`,
    ),
  burn: (body: BurnTokenRequest) =>
    apiRequest<ApiMessage>("/contract/token/burn", { method: "POST", body }),
};
