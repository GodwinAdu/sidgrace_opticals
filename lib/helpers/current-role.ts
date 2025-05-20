import { fetchRole } from "../actions/role.actions";
import { currentUser } from "./current-user";



export async function currentUserRole() {
    try {

        const user = await currentUser();

        const role = user?.role as string;

        if (!user) {
            throw new Error('User not found');
        }

        const userRole: IRole = await fetchRole(role);

        if (!userRole) {
            console.log("cant find User role");
            return ;
        }

        return userRole;

    } catch (error) {
        console.log("Error happen while fetching role", error)
    }
}