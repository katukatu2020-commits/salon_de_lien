# Customer registration default Salon v472

This protected child-image patch restores the customer self-registration
tenant to `Salon de Lien` (`org_salon_de_lien`, `LIEN-SALON`).

- New registration invitations and SMS verification challenges use the
  application default organization, whose production value is LIEN-SALON.
- Registration completion reads the organization from the one-time invitation,
  so the customer, login account, phone identity, and invitation stay in one
  tenant transaction.
- Existing customers, their store links and current store selection, admin
  login, Gmail/LINE reservation ingestion, and reporting are unchanged.
