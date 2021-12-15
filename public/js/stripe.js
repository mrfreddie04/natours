/* eslint-disable */
import axios from "axios";
import { showAlert, hideAlert } from "./alerts";

export const bookTour = async (tourid) => {
  const stripe = Stripe("pk_test_51K6S78EviCKCxc48FAq59QUqeRFnEDBETiDqYtNT2hx9dkMKvPvXEZiXf4BXDzGdskUt79Im0ZALyM7xlLcxj70f00SXKFLo43");
  
  //Use stripe object(with public key) to confirm payment
  try {      
    //1) Get checkout session
    const res = await axios({
      method: "GET",
      url: `/api/v1/bookings/checkout-session/${tourid}`
    });

    //if get session object
    if(res.data.status !== "success") return showAlert("error", "Something went wrong");  
    const { session } = res.data;

    //2) Create checkout fomr and charge CC
    const result = await stripe.redirectToCheckout({
      sessionId: session.id
    });    

    //console.log("Done",result);

  } catch(err) {
    console.error(err);
    showAlert("error", err.response.data.message);
  }
};

// async function initialize() {

//   const response = await fetch("/create-payment-intent", {

//     method: "POST",

//     headers: { "Content-Type": "application/json" },

//     body: JSON.stringify({ items }),

//   });

//   const { clientSecret } = await response.json();


//   const appearance = {

//     theme: 'stripe',

//   };

//   elements = stripe.elements({ appearance, clientSecret });


//   const paymentElement = elements.create("payment");

//   paymentElement.mount("#payment-element");

// }