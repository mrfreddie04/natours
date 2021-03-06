/* eslint-disable */
//type - "success" or "error"
export const showAlert = (type, message, time = 3) => {
  hideAlert();
  const markup = `<div class="alert alert--${type}">${message}</div>`;
  document.querySelector("body").insertAdjacentHTML("afterbegin", markup);
  window.setTimeout(hideAlert, time * 1000);
}

export const hideAlert = () => {
  const alerts = document.querySelectorAll(".alert");
  alerts.forEach(el => el.parentElement.removeChild(el)); 
}