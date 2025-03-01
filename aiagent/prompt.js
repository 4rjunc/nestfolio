import { OpenAI } from "openai"
import 'dotenv/config'
import Together from "together-ai";
const together = new Together();
/**
 * Analyzes a transaction string using OpenAI and extracts structured data
 * @param {string} transactionString - The transaction string to analyze
 * @returns {Promise<Object>} The structured transaction data
 */
export async function analyzeDAOInit(messageString) {
  try {
    const extract = await together.chat.completions.create({
      model: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
      messages: [
        {
          role: "system",
          content: `You are an AI assistant that analyzes messages related to DAO creation. 
          Extract the DAO name and registration fee information. Return ONLY a JSON object with no additional text.`
        },
        {
          role: "user",
          content: `Extract the following information from this message and return it as JSON:
          - daoName: The name of the DAO being created
          - registrationFee: The registration fee amount (as a number)
          - registrationFeeUnit: The currency unit of the registration fee (e.g., "SOL", "USDC")
          
          Message: ${messageString}`
        }
      ],
      response_format: { type: "json_object" }
    });
    
    if (extract?.choices?.[0]?.message?.content) {
      const responseContent = extract.choices[0].message.content;
      console.log("extract", responseContent);
      
      // Parse the JSON string into an object
      let jsonObject;
      try {
        // Remove any markdown formatting if present
        const jsonString = responseContent.replace(/```json\s*|\s*```/g, '');
        console.log("jsonString", jsonString);
        
        jsonObject = JSON.parse(jsonString);
        console.log("daoName", jsonObject.daoName);
        return jsonObject;
      } catch (parseError) {
        console.error("Error parsing JSON:", parseError);
        throw new Error("Failed to parse response as JSON");
      }
    }
  } catch (error) {
    console.error("Error analyzing DAO creation message:", error);
    throw error;
  }
}
