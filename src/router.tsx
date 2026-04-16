import { createBrowserRouter, Navigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { MapPage } from "@/pages/MapPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { AdminDashboardPage } from "@/pages/admin/AdminDashboardPage";

export const router = createBrowserRouter([
	{
		element: <Layout />,
		children: [
			{ index: true, element: <DashboardPage /> },
			{ path: "map", element: <MapPage /> },
			{ path: "admin", element: <AdminDashboardPage /> },
			{ path: "*", element: <Navigate to="/" replace /> },
		],
	},
]);
