import { useQueryClient } from "@tanstack/react-query";
import {
  useGetAuthStatus,
  useLogin,
  useLogout,
  useSetupAdmin,
  useChangePassword,
  getGetAuthStatusQueryKey,
} from "@workspace/api-client-react";

export function useAuth() {
  const queryClient = useQueryClient();
  const status = useGetAuthStatus({
    query: {
      queryKey: getGetAuthStatusQueryKey(),
      refetchOnWindowFocus: true,
      staleTime: 30_000,
    },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getGetAuthStatusQueryKey() });

  const login = useLogin({ mutation: { onSuccess: invalidate } });
  const logout = useLogout({ mutation: { onSuccess: invalidate } });
  const setup = useSetupAdmin({ mutation: { onSuccess: invalidate } });
  const changePassword = useChangePassword({ mutation: { onSuccess: invalidate } });

  return {
    status: status.data,
    isLoading: status.isLoading,
    refetch: status.refetch,
    login,
    logout,
    setup,
    changePassword,
  };
}
