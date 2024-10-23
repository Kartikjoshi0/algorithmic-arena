"use client";


import Editor from "@monaco-editor/react";
import { Tabs, TabsList, TabsTrigger } from "@repo/ui/tabs";
import { Button } from "@repo/ui/button";
import { Label } from "@repo/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@repo/ui/select";
import { useEffect, useState } from "react";
import { LANGUAGE_MAPPING } from "@repo/common/language";
import axios from "axios";
import { ISubmission, SubmissionTable } from "./SubmissionTable";
import { CheckIcon, CircleX, ClockIcon } from "lucide-react";
import { toast } from "react-toastify";
import { signIn, useSession } from "next-auth/react";
import { submissions as SubmissionsType } from "@prisma/client";
import { Turnstile } from "@marsidev/react-turnstile";


const TURNSTILE_SITE_KEY =
  process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY ||
  "0x4AAAAAAAc4qhUEsytXspC_";

enum SubmitStatus {
  SUBMIT = "SUBMIT",
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  FAILED = "FAILED",
}

export interface IProblem {
  id: string;
  title: string;
  description: string;
  slug: string;
  defaultCode: {
    languageId: number;
    code: string;
  }[];
}

//main export function 
export const ProblemSubmitBar = ({
  problem,
  contestId,
}: {
  problem: IProblem;
  contestId?: string;
}) => {
  const [activeTab, setActiveTab] = useState("problem");

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-6">
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Tabs
              defaultValue="problem"
              className="rounded-md p-1"
              value={activeTab}
              onValueChange={setActiveTab}
            >
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="problem">Submit</TabsTrigger>
                <TabsTrigger value="submissions">Submissions</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
        <div className={`${activeTab === "problem" ? "" : "hidden"}`}>
          <SubmitProblem problem={problem} contestId={contestId} />
        </div>
        {activeTab === "submissions" && <Submissions problem={problem} />}
      </div>
    </div>
  );
};

//render submissions in the submit table 
function Submissions({ problem }: { problem: IProblem }) {
  const [submissions, setSubmissions] = useState<ISubmission[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const response = await axios.get(
        `/api/submission/bulk?problemId=${problem.id}`
      );
     

      setSubmissions(response.data.submissions || []);
    };
    fetchData();
  }, [problem.id]);

  return (
    <div>
      <SubmissionTable submissions={submissions} />
    </div>
  );
}

//submits the code and polls the result 
function SubmitProblem({
  problem,
  contestId,
}: {
  problem: IProblem;
  contestId?: string;
}) {
  const [language, setLanguage] = useState(
    Object.keys(LANGUAGE_MAPPING)[0] as string
  );
  const [code, setCode] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<string>(SubmitStatus.SUBMIT);
  const [testcases, setTestcases] = useState<any[]>([]);
  const [token, setToken] = useState<string>("");
  const session = useSession();

  useEffect(() => {
    const defaultCode: { [key: string]: string } = {};
    problem.defaultCode.forEach((code) => {
      const language = Object.keys(LANGUAGE_MAPPING).find(
        (language) => LANGUAGE_MAPPING[language]?.internal === code.languageId
      );
      if (!language) return;
      defaultCode[language] = code.code;
    });
    setCode(defaultCode);
  }, [problem]);

  async function pollWithBackoff(id: string, retries: number,delay: number=1000) { 
    if (retries === 0) {
      setStatus(SubmitStatus.SUBMIT);
      toast.error("Not able to get status ");
      return;
    }

    const response = await axios.get(`/api/submission/?id=${id}`);
    

    console.log('response form SubmitProblem',response);
    if (response.data.submission.status === "PENDING") {
      
      setTestcases(response.data.submission.testcases);
      const nextDelay = Math.min(delay * 2, 30 * 1000);
      await new Promise((resolve) => setTimeout(resolve, nextDelay));
      pollWithBackoff(id, retries - 1,nextDelay);
    } else {
      if (response.data.submission.status === "AC") {
        setStatus(SubmitStatus.ACCEPTED);
        setTestcases(response.data.submission.testcases);
        toast.success("Accepted!");
        return;
      } else {
        setStatus(SubmitStatus.FAILED);
        toast.error("Failed :(");
        setTestcases(response.data.submission.testcases);
        return;
      }
    }
  }

  async function submit() {
    setStatus(SubmitStatus.PENDING);
    setTestcases((t) => t.map((tc) => ({ ...tc, status: "PENDING" })));
    try {
      const response = await axios.post(`/api/submission/`, {
        code: code[language],
        languageId: language,
        problemId: problem.id,
        activeContestId: contestId,
        token: token,
      });
      console.log('response from submit fun inside',response);
      
      pollWithBackoff(response.data.id, 10,1000);
    } catch (e) {
      //@ts-ignore
      toast.error(e.response.statusText);
      setStatus(SubmitStatus.SUBMIT);
    }
  }

  return (
    <div>
      <Label htmlFor="language">Language</Label>
      <Select
        value={language}
        defaultValue="cpp"
        onValueChange={(value) => setLanguage(value)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select language" />
        </SelectTrigger>
        <SelectContent>
          {Object.keys(LANGUAGE_MAPPING).map((language) => (
            <SelectItem key={language} value={language}>
              {LANGUAGE_MAPPING[language]?.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="pt-4 rounded-md">
        <Editor
          height={"60vh"}
          value={code[language]}
          theme="vs-dark"
          onMount={() => {}}
          options={{
            fontSize: 14,
            scrollBeyondLastLine: false,
          }}
          language={LANGUAGE_MAPPING[language]?.monaco}
          onChange={(value) => {
            //@ts-ignore
            setCode({ ...code, [language]: value });
          }}
          defaultLanguage="javascript"
        />
      </div>
      <div className="flex justify-end">
        {process.env.NODE_ENV === "production" ? (
          <Turnstile
            onSuccess={(token: string) => {
              setToken(token);
            }}
            siteKey={TURNSTILE_SITE_KEY}
          />
        ) : null}
        <Button
          disabled={status === SubmitStatus.PENDING}
          type="submit"
          className="mt-4 align-right"
          onClick={session.data?.user ? submit : () => signIn()}
        >
          {session.data?.user
            ? status === SubmitStatus.PENDING
              ? "Submitting"
              : "Submit"
            : "Login to submit"}
        </Button>
      </div>
      <RenderTestcase testcases={testcases}  />
    </div>
  );
}

function renderResult(status: number | null) {
  switch (status) {
    case 1:
      return <ClockIcon className="h-6 w-6 text-yellow-500" />;
    case 2:
      return <ClockIcon className="h-6 w-6 text-yellow-500" />;
    case 3:
      return <CheckIcon className="h-6 w-6 text-green-500" />;
    case 4:
      return <CircleX className="h-6 w-6 text-red-500" />;
    case 5:
      return <ClockIcon className="h-6 w-6 text-red-500" />;
    case 6:
      return <CircleX className="h-6 w-6 text-red-500" />;
    case 13:
      return <div className="text-gray-500">Internal Error!</div>;
    case 14:
      return <div className="text-gray-500">Exec Format Error!</div>;
    default:
      return <div className="text-gray-500">Runtime Error!</div>;
  }
}

function RenderTestcase({ testcases }: { testcases: any[]
}) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleTestcase = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index); 
  };
  return (
    <div className="grid grid-cols-1 gap-4">
      {testcases.length > 0 && testcases.map((testcase, index) => {
        const expectedOutput = atob(testcase.expected_output ?? '').trim(); 
        const userOutput = atob(testcase.stdout ?? '').trim(); 
        const isExpanded = expandedIndex === index;

        return (
          <div key={index} className="border rounded-md p-4">
            <div
              className="items-center cursor-pointer"
              onClick={() => toggleTestcase(index)}
            >
              <div className="font-semibold">Test #{index + 1}</div>
              <div>{renderResult(testcase.status_id)}</div>
            </div>
            {isExpanded && (
              <div className="mt-4">
                <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md mb-2">
                  <div className="font-semibold">Expected Output: {expectedOutput}</div>
                </div>
                <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md mb-2">
                  <div className="font-semibold">Your Output: {userOutput}</div>
                </div>
                {expectedOutput === userOutput ? 
                  <div className="text-green-500 font-semibold">
                    Output Match
                  </div>
                  :
                  <div className="text-red-500 font-semibold">
                    Wrong Answer
                  </div>
                }
                <button className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md mb-2">Add case</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}