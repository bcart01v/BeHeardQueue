type UserType = "admin" | "client";

type User = {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  userType: UserType;
};
