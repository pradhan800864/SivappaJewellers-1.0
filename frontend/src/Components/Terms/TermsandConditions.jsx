import React from "react";
import LegalPage from "../Legal/LegalPage";
import { legalPolicies } from "../Legal/legalContent";

const TermsandConditions = () => {
  return <LegalPage policy={legalPolicies.terms} />;
};

export default TermsandConditions;
