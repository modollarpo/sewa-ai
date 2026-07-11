# SEWA AI Enterprise v2.0 — Website Audit Report

## Executive Summary

This audit evaluates SEWA AI's public-facing website against enterprise-grade standards for clinical AI platforms. The assessment covers branding consistency, messaging effectiveness, SEO optimization, regulatory positioning, and trust signal adequacy.

**Overall Rating:** 7.2/10  
**Enterprise Readiness:** 6.8/10  
**Critical Gaps:** 3 identified  
**Recommended Actions:** 12 items

---

## 1. Branding & Visual Identity

### Current State
- **Color Palette:** Consistent clinical green (#408D7B) across all pages
- **Typography:** IBM Plex Sans/Mono provides medical precision feel
- **Logo Usage:** Consistent placement in navigation
- **Dark Theme:** Appropriate for clinical environments

### Findings
| Issue | Severity | Location | Recommendation |
|-------|----------|----------|----------------|
| Africa pricing page uses hardcoded colors instead of design tokens | Medium | `AfricaPricingPage.tsx:5-11` | Import and use `colors` from design system tokens |
| Inconsistent spacing between pricing cards | Low | `PricingPage.tsx:173` | Standardize to `spacing[5]` (20px) gap |
| Missing hover states on Africa pricing buttons | Low | `AfricaPricingPage.tsx:194-207` | Add hover transitions for consistency |

### Recommendations
1. **Unified Color System:** Replace hardcoded colors in `AfricaPricingPage.tsx` with design system tokens
2. **Component Reuse:** Leverage `Card`, `Button`, `Badge` components from design system
3. **Responsive Grid:** Implement consistent breakpoint handling across all pricing pages

---

## 2. Messaging & Value Proposition

### Current State
- **Hero Messaging:** Clear differentiation between tiers
- **Feature Lists:** Comprehensive clinical capabilities
- **Regional Positioning:** UK/EU/US/Africa segmentation

### Findings
| Issue | Severity | Location | Recommendation |
|-------|----------|----------|----------------|
| Enterprise tier messaging lacks specificity on ROI | High | `PricingPage.tsx:59` | Add quantified outcomes (e.g., "73% faster triage-to-report") |
| Africa page mentions "60-80% discounted" which undermines value | High | `AfricaPricingPage.tsx:118` | Reframe as "purpose-built pricing" (already updated) |
| Clinical validation claims need qualification | Medium | `PricingPage.tsx:80-84` | Add disclaimers for engineering benchmarks vs clinical validation |

### Recommendations
1. **Outcome-Based Messaging:** Lead with clinical outcomes, not technical features
2. **Evidence Tiering:** Clearly distinguish engineering benchmarks from clinical validation
3. **Regional Value Props:** Customize messaging for each healthcare system (NHS, NHIS, etc.)

---

## 3. SEO & Technical Performance

### Current State
- **Meta Tags:** Present but incomplete
- **Structured Data:** Missing
- **Page Speed:** Unknown (requires lighthouse audit)

### Findings
| Issue | Severity | Location | Recommendation |
|-------|----------|----------|----------------|
| Missing Open Graph tags for social sharing | High | All pages | Add OG meta tags for LinkedIn/Twitter previews |
| No structured data (JSON-LD) for medical device | High | `index.html` | Implement MedicalWebPage schema |
| Missing canonical URLs | Medium | All pages | Add canonical tags to prevent duplicate content |
| No sitemap.xml reference | Medium | `index.html` | Add sitemap reference in head |

### Recommendations
1. **Schema Markup:** Implement `MedicalWebPage` and `SoftwareApplication` schemas
2. **Meta Strategy:** Create unique title/description for each page (50-60 chars title, 150-160 chars description)
3. **Open Graph:** Add OG tags with clinical imagery for social proof

---

## 4. Regulatory Positioning

### Current State
- **TRL Disclosure:** Present (TRL 5)
- **SaMD Classification:** Mentioned (Class IIb)
- **Compliance Frameworks:** NHS DSPT, GDPR, HIPAA referenced

### Findings
| Issue | Severity | Location | Recommendation |
|-------|----------|----------|----------------|
| Regulatory status buried in FAQ | High | `PricingPage.tsx:87` | Move to dedicated "Regulatory Status" section |
| Missing NICE Evidence Standards reference | Medium | Throughout | Add NICE AI/Antimicrobial Resistance guidance alignment |
| No clinical validation timeline | Medium | `PricingPage.tsx:80-84` | Add regulatory roadmap with milestones |

### Recommendations
1. **Regulatory Hero:** Create prominent "Regulatory Journey" section
2. **Evidence Standards:** Reference NICE, MHRA, and EU MDR explicitly
3. **Validation Timeline:** Publish expected clearance dates for UKCA/CE/FDA

---

## 5. Trust Signals & Credibility

### Current State
- **Customer Count:** "47+ hospitals and clinics" mentioned
- **Geographic Reach:** "7 countries" referenced
- **SLA Guarantees:** 99.5%-99.99% uptime承诺

### Findings
| Issue | Severity | Location | Recommendation |
|-------|----------|----------|----------------|
| No customer logos or testimonials | High | Throughout | Add NHS Trust logos (with permission) and quotes |
| Missing case studies | High | Throughout | Create 2-3 detailed deployment case studies |
| No security certifications displayed | Medium | Throughout | Add ISO 27001/13485 badges (when achieved) |
| No third-party validation badges | Medium | Throughout | Add Cyber Essentials, DSPT badges |

### Recommendations
1. **Social Proof:** Add customer logos, testimonials, and case studies
2. **Certification Display:** Create "Trust Center" page with compliance badges
3. **Security Assurance:** Add SOC 2 Type II and penetration test results

---

## 6. Conversion Optimization

### Current State
- **CTA Buttons:** "Start Free Trial" and "Contact Enterprise Team"
- **Pricing Transparency:** Regional pricing visible
- **Trial Offer:** 30-day POC mentioned

### Findings
| Issue | Severity | Location | Recommendation |
|-------|----------|----------|----------------|
| No demo booking integration | High | Throughout | Add Calendly or HubSpot meeting scheduler |
| Missing live chat for enterprise inquiries | Medium | Throughout | Add Intercom or Drift for real-time support |
| No exit-intent popup for pricing page | Low | `PricingPage.tsx` | Add lead capture for abandoning visitors |

### Recommendations
1. **Demo Booking:** Integrate scheduling tool for instant demo requests
2. **Live Support:** Implement chat for enterprise inquiries
3. **Lead Capture:** Add exit-intent and scroll-depth triggers

---

## 7. Competitive Differentiation

### Current State
- **Unique Features:** Uncertainty Engine, Metacognition Engine, Federated Learning
- **Pricing Model:** Tiered with regional variations
- **Deployment Options:** Cloud, hybrid, on-premise

### Findings
| Issue | Severity | Location | Recommendation |
|-------|----------|----------|----------------|
| No competitor comparison page | Medium | Throughout | Create "SEWA vs Competitors" page |
| Feature differentiation unclear | Medium | `PricingPage.tsx:63-76` | Add visual comparison matrix |
| No ROI calculator for enterprise | Low | `PricingPage.tsx:267-318` | Extend calculator for enterprise scenarios |

### Recommendations
1. **Competitive Analysis:** Create transparent comparison with Aidoc, Zebra, etc.
2. **Feature Matrix:** Visual comparison showing unique capabilities
3. **Enterprise ROI:** Extend calculator for large-scale deployments

---

## 8. Accessibility & Compliance

### Current State
- **WCAG Level:** Unknown (requires audit)
- **Keyboard Navigation:** Partial implementation
- **Screen Reader Support:** Minimal

### Findings
| Issue | Severity | Location | Recommendation |
|-------|----------|----------|----------------|
| Missing alt text on images | Medium | Throughout | Add descriptive alt text for all images |
| Insufficient color contrast | Medium | Various | Ensure 4.5:1 ratio for body text |
| No skip navigation link | Low | All pages | Add skip-to-main-content link |

### Recommendations
1. **WCAG Audit:** Conduct full WCAG 2.1 AA audit
2. **ARIA Labels:** Add proper ARIA labels for interactive elements
3. **Keyboard Testing:** Ensure full keyboard navigation support

---

## 9. Content Strategy

### Current State
- **Blog:** Present but sparse
- **Documentation:** Technical whitepaper available
- **Publications:** Listed but not linked

### Findings
| Issue | Severity | Location | Recommendation |
|-------|----------|----------|----------------|
| No thought leadership content | Medium | `BlogPage.tsx` | Create clinical AI insights blog |
| Missing research publications | Medium | `PublicationsPage.tsx` | Link to PubMed/arXiv papers |
| No video content | Low | Throughout | Add product demos and webinars |

### Recommendations
1. **Content Calendar:** Monthly clinical AI insights and case studies
2. **Research Hub:** Centralize all publications with abstracts
3. **Video Strategy:** Product demos, customer testimonials, webinars

---

## 10. Internationalization

### Current State
- **Languages:** English only
- **Currencies:** GBP, EUR, USD, NGN, KES, GHS
- **Regions:** UK, EU, US, Africa

### Findings
| Issue | Severity | Location | Recommendation |
|-------|----------|----------|----------------|
| No French translation for Francophone Africa | Medium | `AfricaPricingPage.tsx` | Add French language support |
| Missing Arabic for Middle East expansion | Low | Throughout | Consider RTL support for future markets |
| No local phone numbers | Low | `ContactPage.tsx` | Add regional contact numbers |

### Recommendations
1. **Localization:** Add French for West Africa, Swahili for East Africa
2. **i18n Framework:** Implement react-i18next for future scalability
3. **Regional Contact:** Add local phone numbers and WhatsApp support

---

## 11. Analytics & Tracking

### Current State
- **Google Analytics:** Unknown
- **Heatmaps:** Unknown
- **Conversion Tracking:** Unknown

### Findings
| Issue | Severity | Location | Recommendation |
|-------|----------|----------|----------------|
| No visible analytics implementation | High | Throughout | Add GA4 with healthcare-compliant settings |
| Missing conversion funnels | High | Throughout | Track trial signup → activation → expansion |
| No A/B testing framework | Medium | Throughout | Implement Optimizely or VWO |

### Recommendations
1. **Healthcare Analytics:** Implement GA4 with PHI-safe configurations
2. **Conversion Tracking:** Set up funnels for trial, demo, and purchase
3. **A/B Testing:** Test pricing, messaging, and CTA variations

---

## 12. Security & Privacy

### Current State
- **Privacy Policy:** Present
- **Cookie Policy:** Present
- **DPA:** Mentioned for enterprise

### Findings
| Issue | Severity | Location | Recommendation |
|-------|----------|----------|----------------|
| No Trust Center page | Medium | Throughout | Create dedicated security page |
| Missing penetration test badges | Medium | Throughout | Display security certifications |
| No data processing details | Low | `PrivacyPolicyPage.tsx` | Add technical architecture details |

### Recommendations
1. **Trust Center:** Create `/security` page with certifications
2. **Security Whitepaper:** Publish technical security architecture
3. **Bug Bounty:** Consider program for vulnerability disclosure

---

## Critical Action Items

### Immediate (0-30 days)
1. ✅ Remove "60-80% discounted" language from Africa page (completed)
2. 🔲 Add Open Graph and structured data to all pages
3. 🔲 Create "Regulatory Journey" section on homepage
4. 🔲 Add customer logos and testimonials

### Short-term (30-90 days)
5. 🔲 Implement demo booking integration
6. 🔲 Create competitive comparison page
7. 🔲 Conduct WCAG 2.1 AA accessibility audit
8. 🔲 Add GA4 with healthcare-compliant settings

### Medium-term (90-180 days)
9. 🔲 Launch French language support for Africa
10. 🔲 Create Trust Center page
11. 🔲 Develop case study content
12. 🔲 Implement A/B testing framework

---

## Appendix A: Page-Specific Recommendations

### PricingPage.tsx
- Add enterprise ROI calculator
- Implement exit-intent popup
- Add customer logos section

### AfricaPricingPage.tsx
- ✅ Remove percentage discount language (completed)
- 🔲 Add French language toggle
- 🔲 Include local payment methods (M-Pesa, bank transfer)

### LandingPage.tsx
- Add regulatory journey timeline
- Include video demos
- Add live chat widget

### ContactPage.tsx
- Add regional phone numbers
- Implement Calendly integration
- Add WhatsApp support option

---

## Appendix B: Technical Debt

1. **AfricaPricingPage.tsx:** Hardcoded colors should use design tokens
2. **PricingPage.tsx:** Missing responsive breakpoints for mobile
3. **All pages:** No structured data implementation
4. **All pages:** Missing canonical URLs

---

*Audit conducted: July 2026*  
*Auditor: SEWA AI Engineering Team*  
*Next review: October 2026*
