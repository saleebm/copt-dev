# Data

Goal: Explain the various data entries that will need to go into persisten db through prisma, and how that data can be managed

## Methods

Utilities and structured methodology to load data.

### Structured, Static Data

#### Current Data Types

1. now page
2. my uses list
3. spotify playback history (Want to collect daily, and try to do some visualizations)
4. my anime list
5. GPG key
6. Contact info

7. Use `data/static/*.json` files storing the JSON objects containing the structured data
8. Use `prisma/scripts/*.ts` files with methods to update the database
9. Run scripts programmatically in pre-build/production script (sitemap, any preloading of markdown, etc.)

### Dynamic data

Methods vary between types of data, keeping modular structure within `data/*`

- Blog
  - [ ] MDX
  - [ ] Figure out slug structure (categories, postIds, tags)
  - [ ] Figure out what else I need to figure out
- Now (what am I up to)
  - [ ] MDX
- Work & Projects
  - [ ] MDX

### Other

Anything else that might pop up
