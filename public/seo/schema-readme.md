# SEO Schema Implementation — Fish Shop Ardit
Generated: 2026-05-15

## Schemas implemented on every blog page:
1. **Article** (schema.org/Article)
   - headline, description, image, author, publisher
   - datePublished, dateModified, mainEntityOfPage
   - inLanguage, about (links to LocalBusiness)

2. **BreadcrumbList** (schema.org/BreadcrumbList)
   - Home > Blog > Article Title

3. **LocalBusiness** (schema.org/LocalBusiness)
   - @id: https://freshfish.al/#business
   - Name: Fish Shop Ardit
   - Address: Rruga Idriz Alidhima 230, Sarande 9701, AL
   - Geo: lat 39.874023, lng 19.9925661
   - Phone: +355698967528
   - Hours: Mon-Sun 08:30-22:00
   - Currencies: ALL
   - Languages: sq, en, it

## Hreflang implementation:
- Every blog page has <link rel="alternate" hreflang="en/sq/it/x-default">
- Canonical URLs use trailing slashes
- x-default points to EN version

## Coverage:
- 30 blog posts x 3 languages = 90 article pages
- 3 blog index pages (en, sq, it)
- 106 total sitemap URLs
