/* eslint-disable */
import "@babel/polyfill";
import 'mapbox-gl/dist/mapbox-gl.css';
import { login, logout } from "./login";
import { updateSettings } from "./update-settings";
import { displayMap } from "./mapbox";
import { bookTour } from "./stripe";

console.log("Hello from index.js");

//1) Get DOM elements 
const loginForm = document.querySelector(".form--login");
const userDataForm = document.querySelector(".form-user-data");
const userPasswordForm = document.querySelector(".form-user-password");
const mapBox = document.getElementById('map');
const logoutBtn = document.querySelector(".nav__el--logout");
const bookBtn = document.querySelector("#book-tour");

//2) Get Values - cannot get the values here because the page still loads at that moment???


//3) Execute functionality - if specific DOM element exists on the page
//- Add login form submit event handler
if(loginForm) {
  loginForm.addEventListener("submit", (e) => {
    //preven form submit to the back end
    e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;    
    //console.log(email, password);

    //make ajax request
    login({email, password});
  });
}  

if(userDataForm) {
  userDataForm.addEventListener("submit", async (e) => {
    //preven form submit to the back end
    e.preventDefault();
    //
    const form = new FormData();
    form.append("name",document.getElementById("name").value);
    form.append("email",document.getElementById("email").value);
    form.append("photo",document.getElementById("photo").files[0]);
    //const photo = document.getElementById("photo").files[0];
    //console.log("Photo", photo);
    
    //make ajax request
    await updateSettings(form, "data");

    //update front end with updated user data
    document.getElementById("firstname").textContent = document.getElementById("name").value.split(' ')[0];
  });
}  

if(userPasswordForm) {
  userPasswordForm.addEventListener("submit", async (e) => {
    //preven form submit to the back end
    e.preventDefault();

    const passwordBtn = document.querySelector(".btn--password");
    const passwordCurrent = document.getElementById("password-current").value;
    const password = document.getElementById("password").value;
    const passwordConfirm = document.getElementById("password-confirm").value;
    
    //make ajax request
    passwordBtn.textContent = "Updating...";
    await updateSettings({passwordCurrent, passwordConfirm, password}, "password");
    passwordBtn.textContent = "Save password";

    document.getElementById("password-current").value = "";
    document.getElementById("password").value = "";
    document.getElementById("password-confirm").value = "";
  });
}  

//- Get locations data that was attached to map html element (in a serialized form) as data-locations attribute
//and desserailize into array of location objects
if(mapBox) {
  const locations = JSON.parse(map.dataset.locations);
  displayMap(locations);
}

//- Add logout button event handler
if(logoutBtn) {
  logoutBtn.addEventListener("click",(e)=>{
    logout();
  });
}

if(bookBtn) {
  bookBtn.addEventListener("click",(e)=>{
    e.target.textContent = "Processing...";
    const { tourId } = e.target.dataset;
    bookTour(tourId);
  });
}