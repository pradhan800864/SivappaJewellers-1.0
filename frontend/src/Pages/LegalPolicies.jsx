import React from "react";
import LegalPage, { LegalCentre } from "../Components/Legal/LegalPage";
import { legalPolicies } from "../Components/Legal/legalContent";

export { LegalCentre };

export const PrivacyNotice = () => <LegalPage policy={legalPolicies.privacy} />;
export const StoreFulfilmentPolicy = () => <LegalPage policy={legalPolicies.fulfilment} />;
export const ReturnsRefundsPolicy = () => <LegalPage policy={legalPolicies.returns} />;
export const ProductDisclosures = () => <LegalPage policy={legalPolicies.product} />;
export const ReferralWalletTerms = () => <LegalPage policy={legalPolicies.referral} />;
export const GrievanceRedressal = () => <LegalPage policy={legalPolicies.grievance} />;
