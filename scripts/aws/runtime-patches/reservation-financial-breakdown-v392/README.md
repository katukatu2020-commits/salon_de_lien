# Reservation financial breakdown v392

Adds normalized reservation-email fields for external points, gift certificates, other discounts, prepaid amounts, and the final payment due. The same rules are applied to the compiled Gmail importer, tenant Gmail setup importer, and SES inbound importer.

The appointment page displays those values as separate rows and initializes checkout with the provider-reported payment due, while preserving the gross reservation amount as the planned price.
