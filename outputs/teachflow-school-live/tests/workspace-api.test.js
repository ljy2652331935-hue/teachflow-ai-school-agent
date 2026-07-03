// Compatibility entry point for the school-live API regression suite.
//
// The old workspace API test assumed seeded demo accounts such as
// teacher-lin/student-s002. The school-live app now starts from an empty
// school trial workspace, so the maintained API coverage lives in the
// registration-first system integrity test.
require("./school-live-system-integrity.test.js");
