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

function App() {
    return (
        <BrowserRouter>
            <Routes>

                {/* LOGIN */}
                <Route
                    path="/login"
                    element={<Login />}
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
                        path="/sales-register"
                        element={<SalesRegister />}
                    />

                    <Route
                        path="/purchase-register"
                        element={<PurchaseRegister />}
                    />

                    <Route
                        path="/reactor-timing"
                        element={<ReactorTiming />}
                    />

                    <Route
                        path="/reports"
                        element={<Reports />}
                    />

                    <Route
                        path="/users"
                        element={<Users />}
                    />

                </Route>

                {/* UNKNOWN URL */}
                <Route
                    path="*"
                    element={<Navigate to="/dashboard" replace />}
                />

            </Routes>
        </BrowserRouter>
    );
}

export default App;