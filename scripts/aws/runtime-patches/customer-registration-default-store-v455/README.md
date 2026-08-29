# Customer registration default store v455

This protected child-image patch changes only the customer self-registration
tenant from `Salon de Lien` (`org_salon_de_lien`, `LIEN-SALON`) to
`ヘアサロン 余白と前髪` (`org_showcase_yohaku`, `LIEN-YOHAKU`).

- New registration invitations and SMS verification challenges use the Yohaku
  organization.
- Registration completion reads the organization from the one-time invitation,
  so the customer, login account, phone identity, and invitation stay in one
  tenant transaction.
- Existing customers, existing store links, admin login, Gmail reservation
  ingestion, reporting, and the global `DEFAULT_ORGANIZATION_ID` are unchanged.
