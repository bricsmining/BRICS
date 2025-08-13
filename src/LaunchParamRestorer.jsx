import { useEffect } from "react";

export default function LaunchParamRestorer() {
  useEffect(() => {
    if (!window.location.hash) {
      const storedHash =
        sessionStorage.getItem('tgWebAppHash') ||
        localStorage.getItem('tgWebAppHash');
      if (storedHash) {
        window.location.hash = storedHash;
      }
    }
  }, []);
  return null;
}
