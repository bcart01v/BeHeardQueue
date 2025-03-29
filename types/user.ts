export type UserType = "admin" | "client" | "software_owner";

type User = {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  userType: UserType;
};
