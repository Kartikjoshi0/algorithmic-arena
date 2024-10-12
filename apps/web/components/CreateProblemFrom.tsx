'use client'
"use client";
import React, { useState } from "react";
import axios from "axios";
import { Input } from "@repo/ui/input";
import { Textarea } from "@repo/ui/textarea";
import { Button } from "@repo/ui/button";

const CreateProblemForm = () => {
  const [problemName, setProblemName] = useState("");
  const [functionName, setFunctionName] = useState("");
  const [inputFields, setInputFields] = useState([{ type: "", name: "" }]);
  const [outputFields, setOutputFields] = useState([{ type: "", name: "" }]);
  const [testCases, setTestCases] = useState([{ input: [], output: "" }]);
  const [problemDescription, setProblemDescription] = useState("");

  // Add Input Field
  const addInputField = () => {
    setInputFields([...inputFields, { type: "", name: "" }]);
  };

  // Add Output Field
  const addOutputField = () => {
    setOutputFields([...outputFields, { type: "", name: "" }]);
  };

  // Add Test Case
  const addTestCase = () => {
    setTestCases([...testCases, { input: [], output: "" }]);
  };

  // Submit function to send data to API
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        problemName,
        functionName,
        inputFields,
        outputFields,
        testCases,
        problemDescription,
      };

      const response = await axios.post("/api/problems/create", payload);
      console.log("Problem Created:", response.data);
    } catch (error) {
      console.error("Error creating problem:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 grid md:grid-cols-2 gap-6">
      {/* Problem Name */}
      <div className="md:col-span-2">
        <label>Problem Name</label>
        <Input
          placeholder="Problem Name"
          value={problemName}
          onChange={(e) => setProblemName(e.target.value)}
          required
        />
      </div>

      {/* Function Name */}
      <div className="md:col-span-2">
        <label>Function Name</label>
        <Input
          placeholder="Function Name"
          value={functionName}
          onChange={(e) => setFunctionName(e.target.value)}
          required
        />
      </div>

      {/* Input Fields */}
      <div className="md:col-span-2">
        <label>Input Fields</label>
        {inputFields.map((inputField, index) => (
          <div key={index} className="flex gap-4 mb-4">
            <Input
              placeholder="Input Type (e.g., int)"
              value={inputField.type}
              onChange={(e) => {
                const newInputFields = [...inputFields];
                newInputFields[index].type = e.target.value; // Safe access
                setInputFields(newInputFields);
              }}
              required
            />
            <Input
              placeholder="Input Name (e.g., input1)"
              value={inputField.name}
              onChange={(e) => {
                const newInputFields = [...inputFields];
                newInputFields[index].name = e.target.value; // Safe access
                setInputFields(newInputFields);
              }}
              required
            />
          </div>
        ))}
        <Button type="button" onClick={addInputField}>
          Add Input Field
        </Button>
      </div>

      {/* Output Fields */}
      <div className="md:col-span-2">
        <label>Output Fields</label>
        {outputFields.map((outputField, index) => (
          <div key={index} className="flex gap-4 mb-4">
            <Input
              placeholder="Output Type (e.g., int)"
              value={outputField.type}
              onChange={(e) => {
                const newOutputFields = [...outputFields];
                newOutputFields[index].type = e.target.value; // Safe access
                setOutputFields(newOutputFields);
              }}
              required
            />
            <Input
              placeholder="Output Name (e.g., result)"
              value={outputField.name}
              onChange={(e) => {
                const newOutputFields = [...outputFields];
                newOutputFields[index].name = e.target.value; // Safe access
                setOutputFields(newOutputFields);
              }}
              required
            />
          </div>
        ))}
        <Button type="button" onClick={addOutputField}>
          Add Output Field
        </Button>
      </div>

      {/* Test Cases */}
      <div className="md:col-span-2">
        <label>Test Cases</label>
        {testCases.map((testCase, index) => (
          <div key={index} className="flex gap-4 mb-4">
            <Input
              placeholder="Test Input (array format)"
              value={testCase.input.join(', ')}
              onChange={(e) => {
                const inputArray = e.target.value.split(',').map(num => Number(num.trim())).filter(num => !isNaN(num));
                const newTestCases = [...testCases];
                newTestCases[index].input = inputArray; // Set as array of numbers
                setTestCases(newTestCases);
              }}
              required
            />
            <Input
              placeholder="Expected Output"
              value={testCase.output}
              onChange={(e) => {
                const newTestCases = [...testCases];
                newTestCases[index].output = e.target.value; // Set output
                setTestCases(newTestCases);
              }}
              required
            />
          </div>
        ))}
        <Button type="button" onClick={addTestCase}>
          Add Test Case
        </Button>
      </div>

      {/* Problem Description */}
      <div className="md:col-span-2">
        <label>Problem Description</label>
        <Textarea
          placeholder="Problem Description"
          value={problemDescription}
          onChange={(e) => setProblemDescription(e.target.value)}
          required
        />
      </div>

      {/* Submit Button */}
      <div className="md:col-span-2">
        <Button type="submit">Create Problem</Button>
      </div>
    </form>
  );
};

export default CreateProblemForm;
