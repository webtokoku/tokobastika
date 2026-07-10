// Thermal Printer Service for Web Bluetooth & WebUSB
// BASTIKA PARFUM - "Input Sekali, Pakai Berkali-kali"

export interface PrinterConnection {
  type: "bluetooth" | "usb" | "system";
  deviceName: string;
  status: "disconnected" | "connecting" | "connected" | "error";
  errorMessage?: string;
}

type PrinterStateCallback = (conn: PrinterConnection) => void;

class PrinterService {
  private activeConnection: PrinterConnection = {
    type: "system",
    deviceName: "System Printer (Browser)",
    status: "disconnected",
  };

  private bluetoothDevice: any = null;
  private bluetoothCharacteristic: any = null;
  private usbDevice: any = null;
  private usbEndpointOut: number | null = null;
  private usbInterfaceNumber: number | null = null;

  private listeners: Set<PrinterStateCallback> = new Set();

  constructor() {
    // Try to restore previous connection from localStorage on load
    if (typeof window !== "undefined") {
      this.initAutoConnect();
    }
  }

  private initAutoConnect() {
    const savedType = localStorage.getItem("printer_conn_type") as "bluetooth" | "usb" | "system" | null;
    const savedName = localStorage.getItem("printer_conn_name") || "";

    if (savedType === "bluetooth" && savedName) {
      this.activeConnection = {
        type: "bluetooth",
        deviceName: savedName,
        status: "disconnected", // Wait for user action to trigger reconnect or auto-reconnect silently
      };
      // For Bluetooth, standard security dictates we need a user gesture, but we can display "Ready to Connect"
      console.log("PrinterService: Bluetooth printer stored in cache:", savedName);
    } else if (savedType === "usb") {
      this.activeConnection = {
        type: "usb",
        deviceName: savedName || "USB Printer",
        status: "disconnected",
      };
      // Attempt silent background pairing check for USB
      this.tryAutoConnectUSB();
    } else {
      this.activeConnection = {
        type: "system",
        deviceName: "System Printer (Browser)",
        status: "connected", // System print is always "ready"
      };
    }
  }

  public subscribe(callback: PrinterStateCallback) {
    this.listeners.add(callback);
    callback({ ...this.activeConnection });
    return () => this.listeners.delete(callback);
  }

  private notify() {
    this.listeners.forEach((cb) => cb({ ...this.activeConnection }));
  }

  public getConnection(): PrinterConnection {
    return { ...this.activeConnection };
  }

  public setSystemPrinter() {
    this.disconnectActive();
    this.activeConnection = {
      type: "system",
      deviceName: "System Printer (Browser)",
      status: "connected",
    };
    localStorage.setItem("printer_conn_type", "system");
    localStorage.removeItem("printer_conn_name");
    this.notify();
  }

  private disconnectActive() {
    try {
      if (this.bluetoothDevice && this.bluetoothDevice.gatt.connected) {
        this.bluetoothDevice.gatt.disconnect();
      }
    } catch (e) {
      console.warn("Error disconnecting bluetooth:", e);
    }

    try {
      if (this.usbDevice) {
        this.usbDevice.close();
      }
    } catch (e) {
      console.warn("Error closing USB device:", e);
    }

    this.bluetoothDevice = null;
    this.bluetoothCharacteristic = null;
    this.usbDevice = null;
    this.usbEndpointOut = null;
    this.usbInterfaceNumber = null;
  }

  // ==========================================
  // WEB BLUETOOTH IMPLEMENTATION
  // ==========================================
  public async connectBluetooth(): Promise<void> {
    if (!(navigator as any).bluetooth) {
      throw new Error("Web Bluetooth tidak didukung oleh browser Anda. Gunakan Chrome/Edge/Opera.");
    }

    this.disconnectActive();
    this.activeConnection = {
      type: "bluetooth",
      deviceName: "Mencari perangkat...",
      status: "connecting",
    };
    this.notify();

    try {
      // Prompt user to select a bluetooth device
      // We search for general SPP / Printer profiles, or accept any device with UUID 18f0 or similar
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          "000018f0-0000-1000-8000-00805f9b34fb", // Generic Thermal Printer service
          "00001101-0000-1000-8000-00805f9b34fb", // Serial Port Profile (SPP)
          "49535343-fe7d-41ae-8f1d-b7c1221532ab"  // Microchip service
        ],
      });

      this.activeConnection.deviceName = device.name || "Bluetooth Printer";
      this.notify();

      const server = await device.gatt.connect();
      
      // Attempt to find a printing service
      let service: any = null;
      const services = await server.getPrimaryServices();
      
      // Let's look for known services or grab the first available
      if (services.length > 0) {
        service = services[0];
      } else {
        throw new Error("Tidak ditemukan layanan GATT yang sesuai pada printer ini.");
      }

      const characteristics = await service.getCharacteristics();
      // Look for a characteristic that supports 'write' or 'writeWithoutResponse'
      const writeChar = characteristics.find(
        (c: any) => c.properties.write || c.properties.writeWithoutResponse
      );

      if (!writeChar) {
        throw new Error("Tidak ditemukan karakteristik penulisan (write) pada perangkat ini.");
      }

      this.bluetoothDevice = device;
      this.bluetoothCharacteristic = writeChar;

      this.activeConnection.status = "connected";
      localStorage.setItem("printer_conn_type", "bluetooth");
      localStorage.setItem("printer_conn_name", device.name || "Bluetooth Printer");
      
      // Listen for disconnects
      device.addEventListener("gattserverdisconnected", () => {
        if (this.activeConnection.type === "bluetooth") {
          this.activeConnection.status = "disconnected";
          this.notify();
        }
      });

      this.notify();
    } catch (err: any) {
      console.error("Bluetooth connection error: ", err);
      this.activeConnection.status = "error";
      this.activeConnection.errorMessage = err.message || String(err);
      this.notify();
      throw err;
    }
  }

  // Auto-connect on user interaction if bluetooth is ready
  public async autoReconnectBluetooth(): Promise<boolean> {
    const savedType = localStorage.getItem("printer_conn_type");
    if (savedType !== "bluetooth") return false;

    try {
      await this.connectBluetooth();
      return true;
    } catch (e) {
      console.warn("Failed silent auto-reconnect bluetooth:", e);
      return false;
    }
  }

  // ==========================================
  // WEBUSB IMPLEMENTATION
  // ==========================================
  public async connectUSB(): Promise<void> {
    if (!(navigator as any).usb) {
      throw new Error("WebUSB tidak didukung oleh browser Anda. Gunakan Chrome/Edge/Opera.");
    }

    this.disconnectActive();
    this.activeConnection = {
      type: "usb",
      deviceName: "Mencari perangkat USB...",
      status: "connecting",
    };
    this.notify();

    try {
      // Filter for common printer class 0x07 (Printers)
      const device = await (navigator as any).usb.requestDevice({
        filters: [{ classCode: 0x07 }],
      });

      await this.setupUSBDevice(device);
    } catch (err: any) {
      console.error("USB connection error: ", err);
      this.activeConnection.status = "error";
      this.activeConnection.errorMessage = err.message || String(err);
      this.notify();
      throw err;
    }
  }

  private async setupUSBDevice(device: any) {
    this.activeConnection.deviceName = device.productName || "USB Thermal Printer";
    this.notify();

    await device.open();
    
    // Select configuration
    if (device.configuration === null) {
      await device.selectConfiguration(1);
    }

    // Find the printer interface & endpoint
    let printerInterface: any = null;
    let endpointOut: any = null;

    for (const conf of device.configurations) {
      for (const iface of conf.interfaces) {
        for (const alt of iface.alternates) {
          if (alt.interfaceClass === 7) { // Printer class
            printerInterface = iface;
            for (const ep of alt.endpoints) {
              if (ep.direction === "out") {
                endpointOut = ep;
                break;
              }
            }
          }
        }
      }
    }

    if (!printerInterface) {
      // Fallback: claim interface 0
      printerInterface = device.configuration.interfaces[0];
      const alt = printerInterface.alternates[0];
      endpointOut = alt.endpoints.find((ep: any) => ep.direction === "out") || alt.endpoints[0];
    }

    await device.claimInterface(printerInterface.interfaceNumber);

    this.usbDevice = device;
    this.usbEndpointOut = endpointOut.endpointNumber;
    this.usbInterfaceNumber = printerInterface.interfaceNumber;

    this.activeConnection.status = "connected";
    localStorage.setItem("printer_conn_type", "usb");
    localStorage.setItem("printer_conn_name", device.productName || "USB Printer");
    this.notify();
  }

  private async tryAutoConnectUSB() {
    if (!(navigator as any).usb) return;
    try {
      const devices = await (navigator as any).usb.getDevices();
      const savedName = localStorage.getItem("printer_conn_name");
      const matched = devices.find((d) => d.productName === savedName || d.productName && savedName && d.productName.includes(savedName));

      if (matched) {
        console.log("PrinterService: Found matching auto-connect USB device:", matched.productName);
        await this.setupUSBDevice(matched);
      }
    } catch (e) {
      console.warn("USB auto-connect failed background:", e);
    }
  }

  // ==========================================
  // PRINT DATA SENDER (ESC/POS BINARY WRITER)
  // ==========================================
  public async sendToPrinter(text: string): Promise<boolean> {
    if (this.activeConnection.type === "system") {
      window.print();
      return true;
    }

    if (this.activeConnection.status !== "connected") {
      // Try to auto-reconnect if it's USB
      if (this.activeConnection.type === "usb") {
        await this.tryAutoConnectUSB();
      } else if (this.activeConnection.type === "bluetooth") {
        // Try background reconnection if bluetooth object is cached
        if (this.bluetoothDevice) {
          try {
            await this.bluetoothDevice.gatt.connect();
            this.activeConnection.status = "connected";
            this.notify();
          } catch (e) {}
        }
      }

      if (this.activeConnection.status !== "connected") {
        throw new Error("Printer belum terhubung! Silakan hubungkan terlebih dahulu.");
      }
    }

    // Convert text into Uint8Array for ESC/POS printer
    const encoder = new TextEncoder();
    
    // ESC/POS Init commands: ESC @ (\x1b\x40) + Text content + Feed lines + Cut paper
    const initCmd = new Uint8Array([0x1b, 0x40]);
    const textData = encoder.encode(text + "\n\n\n\n");
    const cutCmd = new Uint8Array([0x1d, 0x56, 0x41, 0x03]); // Full paper cut command
    
    // Combine commands
    const buffer = new Uint8Array(initCmd.length + textData.length + cutCmd.length);
    buffer.set(initCmd, 0);
    buffer.set(textData, initCmd.length);
    buffer.set(cutCmd, initCmd.length + textData.length);

    if (this.activeConnection.type === "bluetooth") {
      if (!this.bluetoothCharacteristic) {
        throw new Error("Karakteristik Bluetooth printer tidak siap.");
      }
      
      // Write in chunks of 20 bytes (standard BLE limit) to prevent buffering issues
      const chunkSize = 20;
      for (let i = 0; i < buffer.length; i += chunkSize) {
        const chunk = buffer.slice(i, i + chunkSize);
        await this.bluetoothCharacteristic.writeValueWithoutResponse(chunk);
        // Small delay to prevent overflow
        await new Promise((resolve) => setTimeout(resolve, 15));
      }
      return true;
    } else if (this.activeConnection.type === "usb") {
      if (!this.usbDevice || this.usbEndpointOut === null) {
        throw new Error("Perangkat USB printer tidak siap.");
      }
      
      await this.usbDevice.transferOut(this.usbEndpointOut, buffer);
      return true;
    }

    return false;
  }

  // Format receipt payload perfectly aligned for 58mm/80mm widths
  public formatInvoiceToEscPos(tx: any, settings: any, getScentPrice: (scent: string) => number, getBottlePrice: (size: string, type: "Kaca" | "Plastik") => number): string {
    const width = settings.paperWidth === "80mm" ? 48 : 32; // Characters per line
    
    const center = (str: string) => {
      if (str.length >= width) return str.substring(0, width);
      const leftPad = Math.floor((width - str.length) / 2);
      return " ".repeat(leftPad) + str;
    };

    const leftRight = (left: string, right: string) => {
      const remaining = width - left.length - right.length;
      if (remaining <= 0) {
        return left.substring(0, width - right.length - 1) + " " + right;
      }
      return left + " ".repeat(remaining) + right;
    };

    const separator = () => "-".repeat(width);
    const dSeparator = () => "=".repeat(width);

    let output = "";

    // Header
    output += center(settings.storeName.toUpperCase()) + "\n";
    if (settings.slogan) output += center(settings.slogan) + "\n";
    if (settings.address) {
      // Split address if too long
      const addrLines = settings.address.match(new RegExp(`.{1,${width}}`, 'g')) || [settings.address];
      addrLines.forEach((l: string) => {
        output += center(l.trim()) + "\n";
      });
    }
    if (settings.phone) output += center(`Telp/WA: ${settings.phone}`) + "\n";
    output += center(settings.headerMessage || "BUKTI PENJUALAN") + "\n";
    output += dSeparator() + "\n";

    // Meta Info
    output += leftRight("TANGGAL :", new Date(tx.date).toLocaleDateString("id-ID") + " " + new Date(tx.date).toLocaleTimeString("id-ID", {hour: '2-digit', minute:'2-digit'})) + "\n";
    output += leftRight("INVOICE :", tx.id.substring(0, 16)) + "\n";
    output += leftRight("KASIR   :", tx.operatorEmail.split("@")[0]) + "\n";
    output += leftRight("PLGGN   :", tx.customerName || "Pelanggan Umum") + "\n";
    output += separator() + "\n";

    // Items Header
    output += leftRight("ITEM / PRODUK", "SUBTOTAL") + "\n";
    output += separator() + "\n";

    // List Items
    if (tx.scentName === "Klaim Promo Potongan") {
      output += leftRight("Loyalty Point Exchange", "Rp 0") + "\n";
    } else if (tx.items && tx.items.length > 0) {
      tx.items.forEach((item: any) => {
        const isHB = item.scentName === "Hanya Botol";
        const isFree = item.isFree;
        const pPerMl = getScentPrice(item.scentName);
        const scentCost = isHB ? 0 : ((item.volumeMl || 0) * pPerMl * (item.bottleCount || 1));
        
        let bPrice = 0;
        if (item.bottleSize !== "None") {
          bPrice = getBottlePrice(item.bottleSize, item.bottleType || "Kaca");
        }
        if (item.noBottleStockDeduct || tx.discountType === "free_bottle") {
          bPrice = 0;
        }

        const totalItemCost = isFree ? 0 : ((scentCost + (bPrice * (item.bottleCount || 1))));

        // Print item description
        const scentPart = isHB ? "Botol" : item.scentName;
        const volPart = isHB ? "" : ` (${item.volumeMl}ml)`;
        const freeLabel = isFree ? " [GRATIS]" : "";
        const titleLine = `${scentPart}${volPart}${freeLabel}`;
        
        output += titleLine.substring(0, width) + "\n";

        // Print quantity detail and subtotal
        const qtyDetail = `${item.bottleCount} pcs x Rp ${(isFree ? 0 : (pPerMl * (isHB ? 0 : (item.volumeMl || 0)) + bPrice)).toLocaleString("id-ID")}`;
        output += leftRight("  " + qtyDetail, "Rp " + totalItemCost.toLocaleString("id-ID")) + "\n";
      });
    } else if (tx.packageName) {
      // Bundling
      output += tx.packageName.substring(0, width) + "\n";
      output += leftRight(`  ${tx.bottleCount || 1} unit`, "Rp " + tx.totalPrice.toLocaleString("id-ID")) + "\n";
    } else {
      // Single Item Legacy
      const isHB = tx.scentName === "Hanya Botol";
      const pPerMl = getScentPrice(tx.scentName || "");
      const scentCost = isHB ? 0 : ((tx.volumeMl || 0) * pPerMl);
      let bPrice = 0;
      if (tx.bottleSize && tx.bottleSize !== "None" && !tx.noBottleStockDeduct) {
        bPrice = getBottlePrice(tx.bottleSize, tx.bottleType || "Kaca");
      }
      const itemSub = (scentCost + bPrice) * (tx.bottleCount || 1);

      output += `${tx.scentName || "Parfum"} (${tx.volumeMl || 0}ml)\n`;
      output += leftRight(`  ${tx.bottleCount || 1} pcs`, "Rp " + itemSub.toLocaleString("id-ID")) + "\n";
    }

    output += separator() + "\n";

    // Summary calculation
    let subtotal = 0;
    if (tx.scentName === "Klaim Promo Potongan") {
      subtotal = tx.discountNominal || 0;
    } else if (tx.packageName) {
      subtotal = tx.totalPrice;
    } else if (tx.items && tx.items.length > 0) {
      subtotal = tx.items.reduce((acc: number, item: any) => {
        if (item.isFree) return acc;
        const isHB = item.scentName === "Hanya Botol";
        const pPerMl = getScentPrice(item.scentName);
        const scentCost = isHB ? 0 : ((item.volumeMl || 0) * pPerMl);
        let bPrice = 0;
        if (item.bottleSize !== "None") {
          bPrice = getBottlePrice(item.bottleSize, item.bottleType || "Kaca");
        }
        if (item.noBottleStockDeduct || tx.discountType === "free_bottle") {
          bPrice = 0;
        }
        return acc + ((scentCost + bPrice) * (item.bottleCount || 1));
      }, 0);
    } else {
      const isHB = tx.scentName === "Hanya Botol";
      const scentCost = isHB ? 0 : ((tx.volumeMl || 0) * getScentPrice(tx.scentName || ""));
      let bPrice = 0;
      if (tx.bottleSize && tx.bottleSize !== "None" && !tx.noBottleStockDeduct) {
        bPrice = getBottlePrice(tx.bottleSize, tx.bottleType || "Kaca");
      }
      subtotal = (scentCost + bPrice) * (tx.bottleCount || 1);
    }

    output += leftRight("SUBTOTAL:", "Rp " + subtotal.toLocaleString("id-ID")) + "\n";

    if (tx.discountNominal) {
      output += leftRight("DISKON:", "-Rp " + tx.discountNominal.toLocaleString("id-ID")) + "\n";
    }

    output += dSeparator() + "\n";
    output += leftRight("TOTAL BAYAR:", "Rp " + (tx.scentName === "Klaim Promo Potongan" ? 0 : tx.totalPrice).toLocaleString("id-ID")) + "\n";
    output += dSeparator() + "\n";

    // Footer messages
    output += center(settings.footerMessage1 || "TERIMA KASIH") + "\n";
    if (settings.footerMessage2) {
      const ftLines = settings.footerMessage2.match(new RegExp(`.{1,${width}}`, 'g')) || [settings.footerMessage2];
      ftLines.forEach((l: string) => {
        output += center(l.trim()) + "\n";
      });
    }

    return output;
  }
}

export const printerService = new PrinterService();
