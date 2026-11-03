// How the check and compare-files scripts end. A crash exits 1 (Node's own code for an uncaught
// error, which tsx keeps whatever handlers are installed), so the other endings have codes of their
// own, and the hosted check tells "ran to the end" from "fell over" by the code alone.
//
// EXIT_DIFFERENCES means something needs a person's attention, which is not the same in both:
// compare-files exits with it when any file differs; check exits with it only when the review of
// the differences against the ticket finds defects. A check run without a review (--no-review, as
// the hosted check runs it) exits 0 however many pages differ: its report and summary say how many.
export const EXIT_DIFFERENCES = 3;
// check found nothing in the baseline to compare for the list types, pages and journeys asked for
export const EXIT_NOTHING_TO_CHECK = 2;
