# Malee CMG Workflow — prototype (MOCK DATA)

Clickable prototype of the CMG (OEM) request → R&D formulation (material codes) → Finance-Factory costing workflow, starting with coconut products.

**Live:** https://piyaster11.github.io/malee-cmg-workflow/ · **Migration guide:** https://piyaster11.github.io/malee-cmg-workflow/migration.html

- Static HTML/JS in `docs/`; data is stored only in the browser (localStorage). Export/Import JSON and Reset demo data under Admin → Data tools.
- Role switcher (CMG, R&D, Finance-Factory, Admin) stands in for logins.
- 20 mock raw materials (RM-xxxxx). Admin can add/edit and import CSV: `code,description,category,unit,std_cost_thb,supplier,active`.
- Notifications are simulated: `notify()` / `deliver()` in `docs/app.js` is the integration point for real email, Teams or LINE.

All names, codes, costs and suppliers are mock data. Do not enter real Malee formulations or costs into this public page.

## Next steps to production
1. Real backend (SharePoint Lists/Dataverse + Power Apps, Google Sheets/AppSheet, or Supabase/Postgres).
2. SSO logins mapped to roles.
3. Real notifications (Outlook/Teams, Gmail/Chat, LINE).
4. Full material code list via CSV or ERP sync (confirm ERP with IT).
5. Pilot one coconut request, then go live. See `docs/migration.html`.
