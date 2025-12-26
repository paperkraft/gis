import AppLayout from "@/components/layout/AppLayout";
import React, { ReactNode } from "react";

const layout = ({ children }: { children: ReactNode }) => {
  return <AppLayout>{children}</AppLayout>;
};

export default layout;
