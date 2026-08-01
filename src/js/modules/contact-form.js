const PHONE_PATTERN = /^[+\d][\d\s()-]{8,}$/;

function setError(field, message) {
  const error = document.querySelector(`[data-error-for="${field.id}"]`);
  if (error) error.textContent = message;
  field.setAttribute("aria-invalid", message ? "true" : "false");
}

function validateContact(form) {
  const name = form.querySelector("#ad");
  const phone = form.querySelector("#telefon");
  const email = form.querySelector("#eposta");
  const project = form.querySelector("#proje");
  const consent = form.querySelector("#kvkk");

  let valid = true;

  setError(name, "");
  setError(phone, "");
  setError(email, "");
  setError(project, "");
  setError(consent, "");

  if (name.value.trim().length < 2) {
    setError(name, "Lütfen adınızı ve soyadınızı yazın.");
    valid = false;
  }

  const phoneValue = phone.value.trim();
  const emailValue = email.value.trim();

  if (!phoneValue && !emailValue) {
    setError(phone, "Telefon veya e-posta alanlarından en az birini doldurun.");
    valid = false;
  }

  if (phoneValue && !PHONE_PATTERN.test(phoneValue)) {
    setError(phone, "Geçerli bir telefon numarası yazın.");
    valid = false;
  }

  if (emailValue && !email.validity.valid) {
    setError(email, "Geçerli bir e-posta adresi yazın.");
    valid = false;
  }

  if (project.value.trim().length < 20) {
    setError(project, "Projenizi en az 20 karakterle kısaca anlatın.");
    valid = false;
  }

  if (!consent.checked) {
    setError(consent, "Devam etmek için gizlilik onayını vermelisiniz.");
    valid = false;
  }

  return valid;
}

export function initContactForm(form) {
  if (!form) return null;

  const submitButton = form.querySelector("[data-submit-button]");
  const status = form.querySelector("[data-form-status]");

  function handleSubmit(event) {
    if (!validateContact(form)) {
      event.preventDefault();
      const firstInvalid = form.querySelector('[aria-invalid="true"]');
      firstInvalid?.focus();
      if (status) status.textContent = "Lütfen işaretlenen alanları kontrol edin.";
      return;
    }

    if (status) status.textContent = "Mesajınız güvenli şekilde gönderiliyor…";
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Gönderiliyor…";
    }
  }

  form.addEventListener("submit", handleSubmit);

  return {
    destroy() {
      form.removeEventListener("submit", handleSubmit);
    },
  };
}
