import User from "../../users/entities/users.entity";

export type AuthenticatedRequest = Request & {
    user: User;
};
