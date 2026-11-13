import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import MainLayout from "./layouts/MainLayout";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import VehicleRegister from "./pages/VehicleRegister";
import SalesRegister from "./pages/SalesRegister";
import PurchaseRegister from "./pages/PurchaseRegister";
import ReactorTiming from "./pages/ReactorTiming";
import Reports from "./pages/Reports";
import Users from "./pages/Users";
import Customers from "./pages/Customers";
import Suppliers from "./pages/Suppliers";
import VehicleMap from "./pages/VehicleMap";
import Inventory from "./pages/Inventory";
import Payments from "./pages/Payments";
import Employees from "./pages/Employees";
import Notifications from "./pages/Notifications";
import AuditLogs from "./pages/AuditLogs";
import Settings from "./pages/Settings";

function App() {
    return (
        <BrowserRouter>
            <Routes>

                {/* LOGIN */}
                <Route
                    path="/login"
                    element={<Login />}
                />
                <Route
                    path="/"
                    element={<Navigate to="/login" replace />}
                />

                {/* MAIN APPLICATION */}
                <Route element={<MainLayout />}>

                    <Route
                        path="/dashboard"
                        element={<Dashboard />}
                    />

                    <Route
                        path="/vehicle-register"
                        element={<VehicleRegister />}
                    />

                    <Route
                        path="/vehicle-map"
                        element={<VehicleMap />}
                    />

                    <Route
                        path="/sales-register"
                        element={<SalesRegister />}
                    />

                    <Route
                        path="/customers"
                        element={<Customers />}
                    />

                    <Route
                        path="/purchase-register"
                        element={<PurchaseRegister />}
                    />

                    <Route
                        path="/suppliers"
                        element={<Suppliers />}
                    />

                    <Route
                        path="/inventory"
                        element={<Inventory />}
                    />

                    <Route
                        path="/payments"
                        element={<Payments />}
                    />

                    <Route
                        path="/reactor-timing"
                        element={<ReactorTiming />}
                    />

                    <Route
                        path="/employees"
                        element={<Employees />}
                    />

                    <Route
                        path="/reports"
                        element={<Reports />}
                    />

                    <Route
                        path="/notifications"
                        element={<Notifications />}
                    />

                    <Route
                        path="/users"
                        element={<Users />}
                    />

                    <Route
                        path="/audit-logs"
                        element={<AuditLogs />}
                    />

                    <Route
                        path="/settings"
                        element={<Settings />}
                    />

                </Route>

                {/* UNKNOWN URL */}
                <Route
                    path="*"
                    element={<Navigate to="/login" replace />}
                />

            </Routes>
        </BrowserRouter>
    );
}

export default App;