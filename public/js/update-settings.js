/* eslint-disable */
import axios from "axios";
import { showAlert, hideAlert } from "./alerts";

export const updateSettings = async (data, type) => {
  try {
    const url =  type === "data"
      ? "/api/v1/users/update-me"
      : "/api/v1/users/change-password";

    const res = await axios({
      method: "PATCH",
      url: url,
      data: data
    });

    //if successful reload the page 
    if(res.data.status === "success") {
      showAlert("success", `User ${type.toUpperCase()} updated successfully`);
    }
  } catch(err) {
    showAlert("error", err.response.data.message);
  }
};
