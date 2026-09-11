"use client";

import type { Icon } from "@phosphor-icons/react";
import {
  ArrowsLeftRightIcon,
  ChartBarIcon,
  ClipboardTextIcon,
  FactoryIcon,
  FlaskIcon,
  HouseIcon,
  PackageIcon,
  ReceiptIcon,
  ShoppingBagIcon,
  TruckIcon,
  UserCircleIcon,
  UsersIcon,
  UserIcon,
} from "@phosphor-icons/react";

export const NAV_ICONS: Record<string, Icon> = {
  "/dashboard": HouseIcon,
  "/materials": FlaskIcon,
  "/purchases": ReceiptIcon,
  "/movements": ArrowsLeftRightIcon,
  "/suppliers": TruckIcon,
  "/recipes": ClipboardTextIcon,
  "/batches": FactoryIcon,
  "/products": PackageIcon,
  "/customers": UsersIcon,
  "/orders": ShoppingBagIcon,
  "/users": UserIcon,
  "/reports": ChartBarIcon,
  "/profile": UserCircleIcon,
};
