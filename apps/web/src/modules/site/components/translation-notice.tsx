/**
 * Work plan Part III, #21: "the fallback is silent... a reader in Nepali
 * mode cannot tell the difference between 'translated' and 'not
 * translated yet.' Silent fallback teaches readers that the Nepali is
 * decorative." Shown only when `isUntranslatedDoc` says the body has
 * nothing translated — written in Nepali, not English, since the reader
 * this notice is for is the one who chose to read in Nepali; a status
 * message in the language they didn't ask for wouldn't tell them
 * anything.
 */
export function TranslationNotice() {
  return (
    <p className="type-small border-brand/40 bg-brand/5 mb-8 border-l-2 py-2 pl-4 italic">
      यो लेख अझै नेपालीमा उपलब्ध छैन — अंग्रेजी पाठ देखाइएको छ।
    </p>
  );
}
