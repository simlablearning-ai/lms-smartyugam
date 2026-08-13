"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Award, Download, Calendar } from "lucide-react";
import { formatDate } from "@/lib/utils";

type Certificate = {
  id: string;
  certificateNumber: string;
  issuedAt: string;
  score: number | null;
  course: { id: string; title: string; code: string | null };
  college: { name: string; code: string };
};

export default function StudentCertificatesPage() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/certificates")
      .then((r) => r.json())
      .then((data) => setCertificates(Array.isArray(data) ? data : []))
      .catch(() => setCertificates([]))
      .finally(() => setLoading(false));
  }, []);

  function handlePrint(cert: Certificate) {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Certificate - ${cert.certificateNumber}</title>
        <style>
          body { font-family: Georgia, serif; text-align: center; padding: 60px; color: #1e293b; }
          .border { border: 8px solid #4f46e5; padding: 40px; max-width: 700px; margin: 0 auto; }
          .inner { border: 2px solid #c7d2fe; padding: 40px; }
          h1 { font-size: 32px; color: #4f46e5; margin-bottom: 8px; }
          .subtitle { font-size: 14px; color: #64748b; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 30px; }
          .name { font-size: 28px; font-weight: bold; margin: 20px 0; border-bottom: 2px solid #e2e8f0; display: inline-block; padding-bottom: 8px; }
          .course { font-size: 18px; margin: 16px 0; }
          .meta { font-size: 13px; color: #64748b; margin-top: 30px; }
          .logo { max-height: 50px; margin-bottom: 16px; }
        </style>
      </head>
      <body>
        <div class="border">
          <div class="inner">
            <img src="https://lms.smartyugam.com/logo.png" class="logo" alt="Logo" />
            <div class="subtitle">Certificate of Completion</div>
            <h1>SmartYugam LMS</h1>
            <p>This is to certify that</p>
            <div class="name">Student</div>
            <p>has successfully completed the course</p>
            <div class="course"><strong>${cert.course.title}</strong></div>
            ${cert.score ? `<p>with a score of <strong>${cert.score.toFixed(0)}%</strong></p>` : ""}
            <div class="meta">
              <p>Certificate No: ${cert.certificateNumber}</p>
              <p>Issued: ${new Date(cert.issuedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
              <p>${cert.college.name}</p>
            </div>
          </div>
        </div>
        <script>window.print();</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }

  return (
    <DashboardShell role="STUDENT">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Certificates</h1>
          <p className="text-slate-500 mt-1">Certificates are issued for completed courses only (not individual staff tests). 
            Certificates earned after passing courses
          </p>
        </div>

        {loading ? (
          <p className="text-center text-slate-500 py-12">Loading...</p>
        ) : certificates.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
            <Award className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No certificates yet.</p>
            <p className="text-sm text-slate-400 mt-1">
              Pass courses to earn certificates.
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {certificates.map((cert) => (
              <div
                key={cert.id}
                className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                    <Award className="h-6 w-6 text-amber-600" />
                  </div>
                  <button
                    onClick={() => handlePrint(cert)}
                    className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-indigo-600"
                    title="Download / Print"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </div>
                <h3 className="font-semibold text-slate-900 mb-1">
                  {cert.course.title}
                </h3>
                <p className="text-xs text-slate-500 mb-3">{cert.college.name}</p>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(cert.issuedAt)}
                  </span>
                  {cert.score !== null && (
                    <span className="font-medium text-emerald-600">
                      {cert.score.toFixed(0)}%
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 mt-2 font-mono">
                  {cert.certificateNumber}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
