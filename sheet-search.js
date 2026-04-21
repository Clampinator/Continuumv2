
// sheet-search.js
// This module contains logic for the client-side search/filter
// functionality for the Eras & Experiences section.

export function initializeSearch(html, sheet) {
  // Use 'input' event instead of 'keyup' for better real-time responsiveness
  html.find('#experience-search').on('input', (event) => {
    const searchInput = $(event.currentTarget);
    const searchTerm = searchInput.val().toLowerCase().trim();
    const allEras = html.find('.era-item');

    // If the search bar is cleared, show everything and reset display properties
    if (searchTerm === "") {
      html.find('.era-item').css('display', 'block');
      html.find('.experience-item, .event-item').css('display', 'flex');
      return;
    }

    // Loop through each top-level era item
    allEras.each((_, eraEl) => {
      const ageElement = $(eraEl);
      const ageTitle = (ageElement.find('.era-title').val() || "").toLowerCase();
      const ageItselfMatches = ageTitle.includes(searchTerm);
      let ageHasMatchingDescendants = false;

      // Loop through each experience within this age
      const experiences = ageElement.find('.experience-item');
      experiences.each((_, expEl) => {
        const experienceElement = $(expEl);
        const expTitle = (experienceElement.find('.experience-title').val() || "").toLowerCase();
        const expDescEl = experienceElement.find('textarea[name*=".description"]');
        const expDesc = (expDescEl.val() || "").toLowerCase();
        
        const experienceItselfMatches = expTitle.includes(searchTerm) || expDesc.includes(searchTerm);
        let experienceHasMatchingEvents = false;

        // Loop through each event within this experience
        const events = experienceElement.find('.event-item');
        events.each((_, eventEl) => {
          const eventElement = $(eventEl);
          const titleIn = eventElement.find('.event-title-input');
          const notesIn = eventElement.find('textarea[name*=".notes"]');
          
          const eventTitle = (titleIn.val() || "").toLowerCase();
          const eventNotes = (notesIn.val() || "").toLowerCase();

          if (eventTitle.includes(searchTerm) || eventNotes.includes(searchTerm)) {
            eventElement.css('display', 'flex');
            experienceHasMatchingEvents = true;
          } else {
            eventElement.css('display', 'none');
          }
        });

        // Decide visibility of the experience
        if (experienceItselfMatches) {
          experienceElement.css('display', 'flex');
          events.css('display', 'flex'); // Show all events if the parent experience matches
          ageHasMatchingDescendants = true;
        } else if (experienceHasMatchingEvents) {
          experienceElement.css('display', 'flex'); // Show experience to reveal matching events
          ageHasMatchingDescendants = true;
        } else {
          experienceElement.css('display', 'none');
        }
      });

      // Decide visibility of the age
      if (ageItselfMatches) {
        ageElement.css('display', 'block');
        // If age matches, we show ALL contained items
        experiences.css('display', 'flex'); 
        ageElement.find('.event-item').css('display', 'flex'); 
      } else if (ageHasMatchingDescendants) {
        ageElement.css('display', 'block'); // Show age to reveal matching descendants
      } else {
        ageElement.css('display', 'none');
      }
    });
  });
}
