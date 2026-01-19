// src/components/PageTitle.jsx
import { useEffect } from "react";

export default function PageTitle({ title }) {
  useEffect(() => {
    const prev = document.title;
    document.title = title || "Hispana TV";
    return () => {
      document.title = prev || "Hispana TV";
    };
  }, [title]);

  return null;
}
