/* eslint-disable */
import axios from "axios";
import { showAlert} from "./alerts";

export const login = async ({email, password}) => {
  try {
    const res = await axios({
      method: "POST",
      url: "/api/v1/users/signin",
      data: { email, password }
    });

    //if successful reload the page 
    if(res.data.status === "success") {
      showAlert("success", "Logged in successfully");
      window.setTimeout(()=>{
        location.assign("/");
      }, 1000);
    }
  } catch(err) {
    console.error(err);
    showAlert("error", err.response.data.message);
  }
};

export const logout = async () => {
  try {
    const res = await axios({
      method: "GET",
      url: "/api/v1/users/signout"
    });

    //if successful reload the page 
    if(res.data.status === "success") {
      showAlert("success", "Logged out successfully");
      window.setTimeout(()=>{
        location.assign("/");
        //location.reload(true);
      }, 500);
    }
    //console.log("Submitted", res);
  } catch(err) {
    console.error(err);
    showAlert("error", "Error logging put! Try again.");
  }
};
