import { useMemo } from 'react';
import { FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from '@/lib/currency';

interface LogbookEntry {
  id: string;
  flight_number: string;
  departure_airport: string;
  arrival_airport: string;
  status: string;
  submitted_at: string;
  flight_time_hrs: number;
  flight_time_mins: number;
  passengers: number | null;
  landing_rate: number | null;
  fuel_used: number | null;
  xp_earned: number | null;
  money_earned: number | null;
  tail_number: string | null;
  cargo_weight_kg?: number | null;
  aircraft: {
    name: string;
    type_code: string;
  };
}

interface PilotProfile {
  name: string;
  callsign: string;
  rank: string;
  base_airport: string | null;
  total_hours: number;
  total_flights: number;
  money: number;
}

interface LogbookPDFExportProps {
  entries: LogbookEntry[];
  profile: PilotProfile | null;
}

export function LogbookPDFExport({ entries, profile }: LogbookPDFExportProps) {
  const stats = useMemo(() => {
    const totalFlights = entries.length;
    const totalHours = entries.reduce((acc, e) => acc + Number(e.flight_time_hrs) + (e.flight_time_mins / 60), 0);
    const totalEarnings = entries.reduce((acc, e) => acc + (Number(e.money_earned) || 0), 0);
    
    // Aircraft breakdown
    const aircraftStats: Record<string, { flights: number; hours: number }> = {};
    entries.forEach(e => {
      const type = e.aircraft?.type_code || 'Unknown';
      if (!aircraftStats[type]) {
        aircraftStats[type] = { flights: 0, hours: 0 };
      }
      aircraftStats[type].flights += 1;
      aircraftStats[type].hours += Number(e.flight_time_hrs) + (e.flight_time_mins / 60);
    });

    // Route breakdown
    const routeStats: Record<string, { count: number; hours: number }> = {};
    entries.forEach(e => {
      const route = `${e.departure_airport} - ${e.arrival_airport}`;
      if (!routeStats[route]) {
        routeStats[route] = { count: 0, hours: 0 };
      }
      routeStats[route].count += 1;
      routeStats[route].hours += Number(e.flight_time_hrs) + (e.flight_time_mins / 60);
    });

    const topRoutes = Object.entries(routeStats)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5);

    const avgFlightDuration = totalFlights > 0 ? totalHours / totalFlights : 0;
    const avgEarnings = totalFlights > 0 ? totalEarnings / totalFlights : 0;

    return {
      totalFlights,
      totalHours,
      totalEarnings,
      aircraftStats,
      topRoutes,
      avgFlightDuration,
      avgEarnings,
      uniqueRoutes: Object.keys(routeStats).length,
      aircraftTypes: Object.keys(aircraftStats).length,
    };
  }, [entries]);

  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const primaryColor: [number, number, number] = [59, 130, 246]; // Blue
    const textDark: [number, number, number] = [31, 41, 55];
    const textMuted: [number, number, number] = [107, 114, 128];
    
    let yPos = 20;

    // Header
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 45, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('PILOT LOGBOOK', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('OFFICIAL FLIGHT RECORD', pageWidth / 2, 30, { align: 'center' });

    // Pilot info
    if (profile) {
      doc.setFontSize(10);
      doc.text(`${profile.name} | ${profile.callsign}`, pageWidth / 2, 40, { align: 'center' });
    }

    yPos = 55;

    // Summary stats boxes
    doc.setTextColor(...textDark);
    const boxWidth = 45;
    const boxSpacing = 5;
    const totalBoxesWidth = (boxWidth * 4) + (boxSpacing * 3);
    const startX = (pageWidth - totalBoxesWidth) / 2;

    const summaryData = [
      { label: 'TOTAL HOURS', value: stats.totalHours.toFixed(1) },
      { label: 'TOTAL FLIGHTS', value: stats.totalFlights.toString() },
      { label: 'CAREER EARNINGS', value: formatCurrency(stats.totalEarnings) },
      { label: 'ROUTES FLOWN', value: stats.uniqueRoutes.toString() },
    ];

    summaryData.forEach((item, index) => {
      const x = startX + (boxWidth + boxSpacing) * index;
      
      doc.setFillColor(243, 244, 246);
      doc.roundedRect(x, yPos, boxWidth, 25, 3, 3, 'F');
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...primaryColor);
      doc.text(item.value, x + boxWidth / 2, yPos + 12, { align: 'center' });
      
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...textMuted);
      doc.text(item.label, x + boxWidth / 2, yPos + 20, { align: 'center' });
    });

    yPos += 35;

    // Pilot Profile Section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...textDark);
    doc.text('CAREER SUMMARY', 14, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    if (profile) {
      doc.text(`Pilot Name: ${profile.name}`, 14, yPos);
      doc.text(`Rank: ${profile.rank}`, 105, yPos);
      yPos += 6;
      doc.text(`Callsign: ${profile.callsign}`, 14, yPos);
      doc.text(`Base: ${profile.base_airport || 'N/A'}`, 105, yPos);
      yPos += 6;
    }
    doc.text(`Average Flight Duration: ${stats.avgFlightDuration.toFixed(2)} hours`, 14, yPos);
    doc.text(`Average Earnings/Flight: ${formatCurrency(stats.avgEarnings)}`, 105, yPos);
    
    yPos += 15;

    // Top Routes Section
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('TOP ROUTES', 14, yPos);
    yPos += 5;

    autoTable(doc, {
      startY: yPos,
      head: [['#', 'Route', 'Flights', 'Total Time']],
      body: stats.topRoutes.map(([route, data], index) => [
        (index + 1).toString(),
        route,
        data.count.toString(),
        `${data.hours.toFixed(1)} hrs`
      ]),
      theme: 'striped',
      headStyles: { fillColor: primaryColor, fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 60 },
        2: { cellWidth: 25 },
        3: { cellWidth: 30 },
      },
      margin: { left: 14, right: 14 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // Aircraft Types Section
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...textDark);
    doc.text('AIRCRAFT TYPES FLOWN', 14, yPos);
    yPos += 5;

    autoTable(doc, {
      startY: yPos,
      head: [['Type', 'Flights', 'Hours']],
      body: Object.entries(stats.aircraftStats).map(([type, data]) => [
        type,
        data.flights.toString(),
        `${data.hours.toFixed(1)} hrs`
      ]),
      theme: 'striped',
      headStyles: { fillColor: primaryColor, fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
    });

    // New page for flight log
    doc.addPage();
    yPos = 20;

    // Flight Log Header
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 25, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('FLIGHT LOG', pageWidth / 2, 15, { align: 'center' });

    yPos = 35;

    // Flight entries table
    const flightData = entries.map((entry, index) => [
      (index + 1).toString(),
      new Date(entry.submitted_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }),
      entry.flight_number,
      entry.departure_airport,
      entry.arrival_airport,
      entry.aircraft?.type_code || '-',
      entry.tail_number || '-',
      `${entry.flight_time_hrs}h ${entry.flight_time_mins}m`,
      entry.passengers?.toString() || '-',
      entry.cargo_weight_kg ? `${(entry.cargo_weight_kg / 1000).toFixed(1)}t` : '-',
      formatCurrency(Number(entry.money_earned) || 0),
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['#', 'Date', 'Flight', 'DEP', 'ARR', 'A/C', 'REG', 'Time', 'PAX', 'Cargo', 'Earnings']],
      body: flightData,
      theme: 'striped',
      headStyles: { fillColor: primaryColor, fontSize: 7, cellPadding: 2 },
      bodyStyles: { fontSize: 7, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 18 },
        2: { cellWidth: 18 },
        3: { cellWidth: 12 },
        4: { cellWidth: 12 },
        5: { cellWidth: 14 },
        6: { cellWidth: 16 },
        7: { cellWidth: 16 },
        8: { cellWidth: 10 },
        9: { cellWidth: 14 },
        10: { cellWidth: 22 },
      },
      margin: { left: 8, right: 8 },
      didDrawPage: (data) => {
        // Footer on each page
        doc.setFontSize(8);
        doc.setTextColor(...textMuted);
        doc.text(
          'This is an official flight record. Data provided for informational purposes only.',
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
        
        // Page number
        const pageCount = (doc as any).internal.getNumberOfPages();
        doc.text(
          `Page ${data.pageNumber} of ${pageCount}`,
          pageWidth - 20,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'right' }
        );
      },
    });

    // Page totals
    yPos = (doc as any).lastAutoTable.finalY + 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...textDark);
    doc.text(`PAGE TOTALS: ${stats.totalFlights} Flights  |  ${stats.totalHours.toFixed(1)} Hours  |  ${formatCurrency(stats.totalEarnings)}`, pageWidth / 2, yPos, { align: 'center' });

    // Generate date for filename
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `Pilot_Logbook_${profile?.callsign || 'Export'}_${dateStr}.pdf`;
    
    doc.save(filename);
  };

  return (
    <Button
      onClick={generatePDF}
      variant="outline"
      className="gap-2"
      disabled={entries.length === 0}
    >
      <FileDown className="h-4 w-4" />
      Export PDF
    </Button>
  );
}
