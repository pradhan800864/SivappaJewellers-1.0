import { toast } from "react-hot-toast";

export const loginUser = async (email, password) => {
    try {
      const response = await fetch("http://localhost:4998/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
  
      const data = await response.json();
  
      if (response.ok) {
        localStorage.setItem("token", data.token);
  
        return {
          success: true,
          token: data.token,               // ✅ include token
          username: data.username || email, // use actual username if available
        };
      } else {
        toast.error(data.error || "Login failed", { duration: 3000 });
        return { success: false };
      }
    } catch (error) {
      toast.error("Server error. Please try again.", { duration: 3000 });
      return { success: false };
    }
  };