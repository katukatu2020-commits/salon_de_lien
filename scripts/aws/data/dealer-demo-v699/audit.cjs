const { PrismaClient } = require('/app/node_modules/@prisma/client');
const db = new PrismaClient();
(async () => {
  const result = await db.$transaction(async tx => {
    await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
    const salons = await tx.$queryRawUnsafe(`SELECT o.id,o.name,o.slug,o."serviceMode" FROM "Organization" o
      WHERE o.name LIKE '%ハレ%' OR o.name LIKE '%はれ%' OR o.id='org_showcase_yohaku'`);
    const dealers = await tx.$queryRawUnsafe(`SELECT d.id,d.name,d."loginId",d.active,
      (SELECT COUNT(*)::int FROM "WholesaleDealerContract" c WHERE c."dealerId"=d.id) contracts,
      (SELECT COUNT(*)::int FROM "WholesaleDealerProduct" p WHERE p."dealerId"=d.id) products,
      (SELECT COUNT(*)::int FROM "WholesaleOrder" o WHERE o."dealerId"=d.id) orders
      FROM "WholesaleDealer" d ORDER BY d."createdAt"`);
    const contracts = salons.length ? await tx.$queryRawUnsafe(`SELECT c.id,c."organizationId",c."dealerId",c.status
      FROM "WholesaleDealerContract" c WHERE c."organizationId"=ANY($1::text[])`, salons.map(s=>s.id)) : [];
    return { salons, dealers, contracts };
  });
  console.log('DEMO_AUDIT_V699 '+JSON.stringify(result));
})().catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>db.$disconnect());
