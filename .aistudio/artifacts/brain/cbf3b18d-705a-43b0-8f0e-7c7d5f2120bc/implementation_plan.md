# Project Renaming & Product Identity Plan

Based on your selected preferences:
- **Style**: Modern software product brand (like *Academix* or *EduGov*)
- **Scope**: Standalone platform name (without hardcoding the college name into the primary brand)
- **Core Capability Focus**: Academic Governance and Administration

---

## 1. Top Recommended Brand Names

Here are the top 5 curated modern software brand names tailored specifically to your platform:

### Option 1 (Top Recommendation): **Academix**
- **Brand Name**: **Academix** (or **Academix One**)
- **Official Tagline**: *Academic Governance & Institutional Operations Platform*
- **Why it fits**: Clean, modern, enterprise SaaS feel. It reflects all academic operations (departments, promotions, schedules, and portfolios) in a cohesive, premium identity.

### Option 2: **EduGov** (or **EduGovernance**)
- **Brand Name**: **EduGov**
- **Official Tagline**: *Next-Generation Academic Governance & Administration Suite*
- **Why it fits**: Directly communicates institutional governance, authority, and administrative orchestration.

### Option 3: **OmniAcademic**
- **Brand Name**: **OmniAcademic**
- **Official Tagline**: *Unified Academic Administration & Governance System*
- **Why it fits**: "Omni" signifies that every role (Master Admin, Department HOD, Teaching Faculty, Non-Teaching Staff, and Students) has a dedicated workspace in one unified system.

### Option 4: **Schedula Academic** (or **Schedula**)
- **Brand Name**: **Schedula**
- **Official Tagline**: *Intelligent Academic Governance & Lifecycle Platform*
- **Why it fits**: Modern, sharp, and highlights institutional rhythm, academic calendars, timetables, and student progression.

### Option 5: **GovernIQ**
- **Brand Name**: **GovernIQ**
- **Official Tagline**: *Smart Academic Governance & Department Administration*
- **Why it fits**: Modern tech branding emphasizing smart algorithms for balanced mentor allocation, promotion rules, and conflict-free timetables.

---

## 2. Implementation & Rollout Plan (Upon User Approval)

*Note: As instructed, no changes are made until you choose and approve your preferred name.*

Once you select your favorite name (e.g., **Academix**):

### Phase 1: Global Identity & Metadata
- Update HTML entry point `<title>` in `index.html` to `<Brand Name> — Academic Governance & Administration Platform`.
- Update application metadata descriptions and OpenGraph preview tags.
- Update `metadata.json` project display description without altering system identifiers.

### Phase 2: Navigation & Header Branding
- Update `Navbar.tsx`: Replace "FPMS" with the chosen modern brand mark (e.g. **Academix**) paired with the subtitle *Academic Governance & Administration*.
- Update `Sidebar.tsx`: Ensure portal header reflects `<Brand Name> Portal`.
- Keep college institutional credentials and affiliations ("Maharaja Institute of Technology Mysore") as the operating institution in footers and official circular headers.

### Phase 3: Login & Landing Page Presentation
- Update `LandingPage.tsx`: Hero title, product badges, and feature highlights aligned with the new product identity.
- Update `LoginPage.tsx`: Header badge and portal title to match the new brand.

### Phase 4: System Verification
- Execute `compile_applet` and `lint_applet` to verify clean build.
- Run the full test suite (`npx tsx --test`) ensuring 100% test passage.
- Verify running application on port 3000.
