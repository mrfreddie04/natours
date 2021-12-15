/* eslint-disable */
//type - "success" or "error"
export const showAlert = (type, message) => {
  hideAlert();
  const markup = `<div class="alert alert--${type}">${message}</div>`;
  document.querySelector("body").insertAdjacentHTML("afterbegin", markup);
  window.setTimeout(hideAlert,3000);
}

export const hideAlert = () => {
  const alerts = document.querySelectorAll(".alert");
  alerts.forEach(el => el.parentElement.removeChild(el)); 
}