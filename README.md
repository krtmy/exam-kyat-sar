# Exam Kyat Sar Search

A local search engine for the nine supplied exam files. No account, external API, or internet connection is required to use the built app. Node.js must be installed (it is already installed on this computer).

## Open the app

Double-click **Start Exam Kyat Sar.cmd**, then keep its window open. It opens http://127.0.0.1:4173 in your browser. Close the window or press Ctrl+C to stop the app.

Type a topic and press Enter. Try **project success**, **rational agent**, **decision making**, **TCP**, or **question 42**. Use Ctrl+K or `/` to focus search. Results open original PDFs at the matching page, or a formatted Word rendering near the matching paragraph. The reader supports search, previous/next matches, PDF page navigation and zoom. Escape or Back to Search restores the previous query and results.

## Included documents

- Networking: NE_Lq+Tuto.pdf; CST-4404_Review Questions and Answers (2).pdf
- AI: AI_18_probs_diagram (2).pdf
- MEE: AII with  ans (1).docx; Assignment (III)withans (2).docx; Assignment Iwith ans.docx; Project Management Questions  Answers (1,2,3) (1) (3).pdf; Tutorial3(mee).pdf; Tutorial I(mee).pdf

All originals are preserved in `public/documents/` and copied into the production build. The local index contains 64 PDF pages and 216 Word sections. PDF page numbers refer to physical pages. NE_Lq+Tuto page 8 and Tutorial I page 5 were rendered and confirmed blank; all nonblank PDF pages contained extractable text, so OCR was unnecessary. Both embedded Word images are preserved. Image-only diagram labels inside Word images are not separately OCR-indexed. Word rendering preserves content and supported formatting but does not reproduce Word's exact pagination.

Some illustrative topics in the brief, such as Markov and eigenvector, do not occur in the supplied text. No sample content has been added. Searches match all words, promote exact phrases, accept partial words and modest spelling errors, and recognize Q42 / R42 / question 42. Numbers are never fuzzy-matched. Counts show matching pages or sections, rather than individual word occurrences.

## Development

`npm install` installs dependencies; `npm run index` rebuilds the index and Word HTML from every PDF/DOCX in `public/documents`; `npm test` checks real-document search coverage; `npm run build` creates `dist`; `npm run dev` starts the development preview.

Document indexing uses PDF.js and Mammoth. Search uses MiniSearch. Original Word HTML is sanitized before display. Dependencies and PDF worker are bundled locally, without CDN requests. For new scanned documents, add an OCR stage before indexing; the existing script reports low-text pages for inspection.
