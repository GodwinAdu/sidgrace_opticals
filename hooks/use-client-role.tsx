"use client"
import { useEffect, useState } from "react";



const useClientRole = () => {
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [role, setRole] = useState<IRole | undefined>(undefined);
    // const pathname = usePathname();

    useEffect(() => {
        const fetchRole = async () => {
            setIsLoading(true);
            // const data = await currentUserRole();
            // setRole(data);
            // setIsLoading(false);
        };
        fetchRole();
    }, []);
    return { role, isLoading };
};

export default useClientRole;
