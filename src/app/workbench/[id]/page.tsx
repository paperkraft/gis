"use client";

import { Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ProjectService } from "@/lib/services/ProjectService";
import { useNetworkStore } from "@/store/networkStore";
import WorkbenchLayout from "@/components/workbench/WorkbenchLayout";

const MapContainer = dynamic(
  () => import("@/components/map/MapContainer").then((mod) => mod.MapContainer),
  { ssr: false }
);

export default function WorkbenchEditor() {
  const params = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initProject = async () => {
      if (params.id) {
        // Clear previous project data immediately
        useNetworkStore.getState().clearFeatures();

        try {
          const success = await ProjectService.loadProject(params.id as string);
          if (!success) {
            // Optional: Handle not found more gracefully
            router.replace("/");
            console.error("Project load returned false");
          }
        } catch (e) {
          console.error("Project load failed", e);
          router.replace("/");
        } finally {
          setLoading(false);
        }
      }
    };

    initProject();
  }, [params.id, router]);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-gray-500">Loading Project...</p>
        </div>
      </div>
    );
  }

  return (
    <WorkbenchLayout>
      <MapContainer />
    </WorkbenchLayout>
  );
}
