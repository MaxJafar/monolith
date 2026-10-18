using System;
using System.ComponentModel;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

public static class MonolithBuildBudget {
    const ulong MiB = 1024 * 1024, GiB = 1024 * MiB;
    [StructLayout(LayoutKind.Sequential)] struct Basic {
        public long ProcessTime, JobTime; public uint Flags;
        public UIntPtr Minimum, Maximum; public uint Active; public UIntPtr Affinity;
        public uint Priority, Scheduling;
    }
    [StructLayout(LayoutKind.Sequential)] struct Io { public ulong ReadOps, WriteOps, OtherOps, ReadBytes, WriteBytes, OtherBytes; }
    [StructLayout(LayoutKind.Sequential)] struct Extended {
        public Basic Basic; public Io Io; public UIntPtr ProcessMemory, JobMemory, PeakProcess, PeakJob;
    }
    [StructLayout(LayoutKind.Sequential)] struct Memory {
        public uint Length, Load; public ulong Total, Available, TotalCommit, AvailableCommit, TotalVirtual, AvailableVirtual, Extended;
    }
    [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] struct Startup {
        public uint Size; public string Reserved, Desktop, Title;
        public uint X, Y, Width, Height, XChars, YChars, Fill, Flags;
        public ushort Show, ReservedSize; public IntPtr ReservedData, Input, Output, Error;
    }
    [StructLayout(LayoutKind.Sequential)] struct ProcessInfo { public IntPtr Process, Thread; public uint Pid, Tid; }
    [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern IntPtr CreateJobObjectW(IntPtr attrs, string name);
    [DllImport("kernel32.dll", SetLastError=true)] static extern bool SetInformationJobObject(IntPtr job, int kind, ref Extended data, uint size);
    [DllImport("kernel32.dll", SetLastError=true)] static extern bool QueryInformationJobObject(IntPtr job, int kind, ref Extended data, uint size, IntPtr returned);
    [DllImport("kernel32.dll", SetLastError=true)] static extern bool AssignProcessToJobObject(IntPtr job, IntPtr process);
    [DllImport("kernel32.dll", SetLastError=true)] static extern bool TerminateJobObject(IntPtr job, uint code);
    [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern bool CreateProcessW(string app, StringBuilder command, IntPtr processAttrs, IntPtr threadAttrs, bool inherit, uint flags, IntPtr environment, string cwd, ref Startup startup, out ProcessInfo process);
    [DllImport("kernel32.dll", SetLastError=true)] static extern uint ResumeThread(IntPtr thread);
    [DllImport("kernel32.dll", SetLastError=true)] static extern bool TerminateProcess(IntPtr process, uint code);
    [DllImport("kernel32.dll", SetLastError=true)] static extern bool GetExitCodeProcess(IntPtr process, out uint code);
    [DllImport("kernel32.dll", SetLastError=true)] static extern IntPtr OpenProcess(uint access, bool inherit, int pid);
    [DllImport("kernel32.dll")] static extern uint WaitForSingleObject(IntPtr handle, uint milliseconds);
    [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle);
    [DllImport("kernel32.dll")] static extern IntPtr GetCurrentProcess();
    [DllImport("kernel32.dll")] static extern IntPtr GetStdHandle(int kind);
    [DllImport("kernel32.dll", SetLastError=true)] static extern bool GetProcessAffinityMask(IntPtr process, out UIntPtr processMask, out UIntPtr systemMask);
    [DllImport("kernel32.dll", SetLastError=true)] static extern bool GlobalMemoryStatusEx(ref Memory memory);
    static void Check(bool ok) { if (!ok) throw new Win32Exception(Marshal.GetLastWin32Error()); }
    static Memory Sample() {
        var sample = new Memory { Length = (uint)Marshal.SizeOf(typeof(Memory)) };
        Check(GlobalMemoryStatusEx(ref sample)); return sample;
    }
    static string Quote(string value) { return "\"" + value.Replace("\"", "\\\"") + "\""; }
    public static bool CanStart(ulong available, uint load, int limitMiB) {
        return available >= Math.Max(2 * GiB, (ulong)limitMiB * 2 * MiB) && load < 75;
    }
    public static bool CanContinue(ulong available, uint load, int limitMiB) {
        return available >= Math.Max(GiB, (ulong)limitMiB * 3 * MiB / 2) && load < 80;
    }

    public static int Run(string node, string dispatcher, string cwd, int ownerPid, bool root, int limitMiB) {
        if (limitMiB < 256 || limitMiB > 4096) throw new ArgumentException("Build cap must be 256–4096 MiB.");
        Mutex mutex = null; bool locked = false;
        IntPtr job = IntPtr.Zero, owner = IntPtr.Zero;
        var process = new ProcessInfo(); bool assigned = false;
        ulong minimum = UInt64.MaxValue, peak = 0;
        try {
            if (root) {
                mutex = new Mutex(false, "Local\\Monolith.SingleBuild.v1");
                try { locked = mutex.WaitOne(0); } catch (AbandonedMutexException) { locked = true; }
                if (!locked) throw new InvalidOperationException("Another build is still shutting down; no second build was started.");
            }
            var memory = Sample(); minimum = memory.Available;
            if (!CanStart(memory.Available, memory.Load, limitMiB))
                throw new InvalidOperationException("Build refused: insufficient free RAM for the configured cap or memory use at least 75%.");
            owner = OpenProcess(0x00100000, false, ownerPid); Check(owner != IntPtr.Zero);
            job = CreateJobObjectW(IntPtr.Zero, null); Check(job != IntPtr.Zero);
            UIntPtr processMask, systemMask;
            Check(GetProcessAffinityMask(GetCurrentProcess(), out processMask, out systemMask));
            ulong mask = processMask.ToUInt64(), first = mask & (~mask + 1), rest = mask ^ first;
            ulong affinity = first | (rest & (~rest + 1));
            var limits = new Extended {
                Basic = new Basic { Flags = 0x100 | 0x200 | 0x2000 | 0x400 | 0x10 | 0x20 | 0x8, Active = 48, Affinity = new UIntPtr(affinity), Priority = 0x40 },
                ProcessMemory = new UIntPtr((ulong)limitMiB * MiB), JobMemory = new UIntPtr((ulong)limitMiB * MiB)
            };
            Check(SetInformationJobObject(job, 9, ref limits, (uint)Marshal.SizeOf(typeof(Extended))));
            var actual = new Extended();
            Check(QueryInformationJobObject(job, 9, ref actual, (uint)Marshal.SizeOf(typeof(Extended)), IntPtr.Zero));
            if (actual.JobMemory != limits.JobMemory || (actual.Basic.Flags & 0x200) == 0)
                throw new InvalidOperationException("Windows did not enforce the build memory cap.");
            var startup = new Startup { Size = (uint)Marshal.SizeOf(typeof(Startup)), Flags = 0x100 | 1, Show = 0,
                Input = GetStdHandle(-10), Output = GetStdHandle(-11), Error = GetStdHandle(-12) };
            Check(CreateProcessW(node, new StringBuilder(Quote(node) + " " + Quote(dispatcher)), IntPtr.Zero, IntPtr.Zero, true,
                0x4 | 0x08000000 | 0x40, IntPtr.Zero, cwd, ref startup, out process)); // suspended, hidden, idle
            Check(AssignProcessToJobObject(job, process.Process)); assigned = true;
            if (ResumeThread(process.Thread) == UInt32.MaxValue) throw new Win32Exception(Marshal.GetLastWin32Error());
            Console.Error.WriteLine("[build guard] One build step; " + limitMiB + " MiB tree commit cap; 2 logical CPUs; idle priority.");
            int code;
            while (true) {
                var waited = WaitForSingleObject(process.Process, 250);
                if (waited == 0) { uint result; Check(GetExitCodeProcess(process.Process, out result)); code = unchecked((int)result); break; }
                if (waited == UInt32.MaxValue) throw new Win32Exception(Marshal.GetLastWin32Error());
                memory = Sample(); minimum = Math.Min(minimum, memory.Available);
                Check(QueryInformationJobObject(job, 9, ref actual, (uint)Marshal.SizeOf(typeof(Extended)), IntPtr.Zero));
                peak = Math.Max(peak, actual.PeakJob.ToUInt64());
                if (WaitForSingleObject(owner, 0) != 258 || !CanContinue(memory.Available, memory.Load, limitMiB)) {
                    Console.Error.WriteLine("[build guard] Stopping this owned build tree: parent closed or system memory reserve reached.");
                    Check(TerminateJobObject(job, 125)); code = 125; break;
                }
            }
            Check(QueryInformationJobObject(job, 9, ref actual, (uint)Marshal.SizeOf(typeof(Extended)), IntPtr.Zero));
            peak = Math.Max(peak, actual.PeakJob.ToUInt64());
            minimum = Math.Min(minimum, Sample().Available);
            // A failed/finished command must not leave compiler children behind.
            Check(TerminateJobObject(job, unchecked((uint)code)));
            WaitForSingleObject(process.Process, 5000);
            Console.Error.WriteLine("[build guard] Peak tree commit " + (peak / MiB) + " MiB; minimum free RAM " + (minimum / MiB) + " MiB.");
            return code;
        } finally {
            if (process.Process != IntPtr.Zero && !assigned) TerminateProcess(process.Process, 125);
            if (job != IntPtr.Zero) CloseHandle(job); // kill-on-close applies only to this build's descendants
            if (process.Thread != IntPtr.Zero) CloseHandle(process.Thread);
            if (process.Process != IntPtr.Zero) CloseHandle(process.Process);
            if (owner != IntPtr.Zero) CloseHandle(owner);
            if (locked) mutex.ReleaseMutex();
            if (mutex != null) mutex.Dispose();
        }
    }
}
