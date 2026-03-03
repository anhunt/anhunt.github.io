let isGoing = false;
let isNotGoing = false;

const nameInput = document.querySelector("#name-input");
const guestInput = document.querySelector("#guest-input");
const guestField = document.querySelector("#guest-field");
// Try getting the yes, no, confirmation and regret elements from the html.
const btnYes = document.querySelector("#btn-yes");
const btnNo = document.querySelector("#btn-no");
const confirmation = document.querySelector("#confirmation");
const regret = document.querySelector("#regret");
// getName() returns the name from the input, or 'Someone' if it's empty.
// .trim() removes whitespace from both ends of a string.
const getName = () => {
  const raw = nameInput.value.trim();
  return raw || "Someone";
};

const getGuests = () => Number(guestInput.value);
//   - set isGoing = true, isNotGoing = false
btnYes.addEventListener("click", () => {
  isGoing = true;
  isNotGoing = false;
  //   - add 'active' class to btnYes, remove it from btnNo
  btnYes.classList.add("active");
  btnNo.classList.remove("active");
  //   - remove 'hidden' from guestField (show it)
  guestField.classList.remove("hidden");
  //   - remove 'hidden' from confirmation, add 'hidden' to regret
  confirmation.classList.remove("hidden");
  regret.classList.add("hidden");
  //   - call updateConfirmation() (written below in Task 3)
  updateConfirmation();
});
btnNo.addEventListener("click", () => {
  //   - set isGoing = false, isNotGoing = true
  isGoing = false;
  isNotGoing = true;
  //   - add 'active' class to btnNo, remove it from btnYes
  btnNo.classList.add("active");
  btnYes.classList.remove("active");
  //   - add 'hidden' to guestField (hide it)
  guestField.classList.add("hidden");
  //   - add 'hidden' to confirmation, remove 'hidden' from regret
  confirmation.classList.add("hidden");
  //   - set regret.textContent using a template literal with getName()
  regret.classList.remove("hidden");
  regret.textContent = `${getName()} cannot make it`;
});

const updateConfirmation = () => {
  const guests = getGuests();

  let guestLine;
  // The guest count needs a conditional:
  //   0 guests → "flying solo."
  //   1 guest  → "bringing 1 guest."
  //   2+ guests → "bringing 3 guests."
  if (guests === 0) {
    guestLine = "flying solo";
  } else if (guests === 1) {
    guestLine = "bringing 1 guest";
  } else {
    guestLine = `bringing ${guests} guests`;
  }
  confirmation.textContent = `${getName()} is coming - ${guestLine}`;
};
// Add 'input' event listeners to nameInput and guestInput.
nameInput.addEventListener("input", () => {
  if (isGoing) {
    updateConfirmation();
  }

  if (isNotGoing) {
    regret.textContent = `${getName()} cannot make it`;
  }
});

guestInput.addEventListener("input", () => {
  if (isGoing) {
    updateConfirmation();
  }
});

// ── DEBUGGING ────────────────────────────────────────────────
// Type checkStatus() in the browser console to see current variable values.

const checkStatus = () => {
  console.log("=== current state ===");
  console.log("isGoing:    ", isGoing);
  console.log("isNotGoing: ", isNotGoing);
  console.log("name:       ", nameInput.value);
  console.log("guests:     ", getGuests(), "(type:", typeof getGuests(), ")");
  console.log(
    "raw value:  ",
    guestInput.value,
    "(type:",
    typeof guestInput.value,
    ")",
  );
  console.log("====================");
};

// Type resetCard() in the browser console to clear everything and start over.

const resetCard = () => {
  isGoing = false;
  isNotGoing = false;

  nameInput.value = "";
  guestInput.value = "0";

  btnYes.classList.remove("active");
  btnNo.classList.remove("active");

  guestField.classList.add("hidden");
  confirmation.classList.add("hidden");
  regret.classList.add("hidden");

  confirmation.textContent = "";
  regret.textContent = "";

  console.log("Card reset.");
};

// Toggles the Going / Can't make it buttons correctly, with only one active at a time
// Shows the guest count field only when the user clicks Going
// Displays a confirmation or regret message using the user's name
// Updates displayed text live as the user types
// Uses contemporary JavaScript DOM selection and event handling