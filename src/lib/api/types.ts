import type { components } from "./schema";

type Schemas = components["schemas"];

export type ApiMessage = Schemas["APIResponse"];
export type JwtToken = Schemas["JwtToken"];
export type User = Schemas["User"];
export type Role = User["role"];
export type KycStatus = NonNullable<User["kyc_status"]>;

export type SignInRequest = Schemas["SignInRequest"];
export type SignUpRequest = Schemas["SignUpRequest"];

export type RealEstateSummary = Schemas["RealEstateSummary"];
export type RealEstate = Schemas["RealEstate"];
export type RealEstateMedia = Schemas["RealEstateMedia"];
export type RealEstateAddress = Schemas["RealEstateAddress"];
export type RealEstateWriteRequest = Schemas["RealEstateWriteRequest"];
export type RealEstatePatchRequest = Schemas["RealEstatePatchRequest"];
export type RealEstateMediaInput = Schemas["RealEstateMediaInput"];
export type RealEstateConfigurationInput =
  Schemas["RealEstateConfigurationInput"];
export type RealEstateSpecificationInput =
  Schemas["RealEstateSpecificationInput"];

export type Issuer = Schemas["Issuer"];
export type IssuerWriteRequest = Schemas["IssuerWriteRequest"];
export type IssuerPatchRequest = Schemas["IssuerPatchRequest"];

export type IssuanceOrder = Schemas["IssuanceOrder"];
export type IssuanceOrderFee = Schemas["IssuanceOrderFee"];
export type OrderStatusCode = Schemas["IssuanceOrderStatusCode"];
export type CreateIssuanceOrderRequest = Schemas["CreateIssuanceOrderRequest"];

export type KycVerification = Schemas["KycVerification"];
export type KycVerificationRequest = Schemas["KycVerificationRequest"];
export type KycOnChainSyncResponse = Schemas["KycOnChainSyncResponse"];
export type KycOnChainStatus = Schemas["KycOnChainStatus"];

export type TrexSuiteInfos = Schemas["TrexSuiteInfos"];
export type ContractDetails = Schemas["ContractDetails"];
export type TxHashName = Schemas["TxHashName"];
export type IdentityInfos = Schemas["IdentityInfos"];
export type TokenInfos = Schemas["TokenInfos"];
export type CreateIdentityRequest = Schemas["CreateIdentityRequest"];
export type AddClaimRequest = Schemas["AddClaimRequest"];
export type CreateTokenRequest = Schemas["CreateTokenRequest"];
export type BurnTokenRequest = Schemas["BurnTokenRequest"];

export type HealthResponse = { status: string; version?: string };

/** Envelope used by most mutating endpoints: `{ message, data }`. */
export type Envelope<T> = { message?: string; data: T };
