"use client";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Info } from "lucide-react";

const SuccessIcon = () => (
  <svg width="9" height="7" viewBox="0 0 9 7" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M0.75 3.75L2.75 5.75L7.75 0.75" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ErrorIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1 9L9 1M1 1L9 9" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const InfoIcon = () => (
  <Info size={16} strokeWidth={2.5} color="white" />
);

const WarningIcon = () => (
  <svg width="10" height="14" viewBox="0 0 10 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5 1V8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="5" cy="12" r="1.5" fill="white"/>
  </svg>
);

export default function ToastProvider() {
  return (
    <ToastContainer
      position="bottom-center"
      autoClose={4000}
      hideProgressBar={true}
      newestOnTop={false}
      closeOnClick={false}
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme="light"
      icon={({ type }) => {
        if (type === "success") {
          return <SuccessIcon />;
        }
        if (type === "error") {
          return <ErrorIcon />;
        }
        if (type === "warning") {
          return <WarningIcon />;
        }
        if (type === "info" || type === "default") {
          return <InfoIcon />;
        }
      }}
    />
  );
}
