/**
 * Domain Radar MCP Tools for checking domain availability and information
 */

import { z } from "zod";
import apiClient from "../utils/api-client.js";
import { createErrorResponse } from "../utils/error-handler.js";
import { DomainInfo } from "../types.js";

// Cache for domain data to reduce API calls
let expiringDomainsCache = [];
let expiredDomainsCache = [];
let lastCacheUpdate = 0;
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes in milliseconds

/**
 * Register domain availability tools
 */
export const registerDomainTools = (server) => {
  // ====================================
  // Tool Domain Availability
  // ====================================
  server.tool(
    "check-domain-availability",
    "Check if a domain name is available for registration",
    {
      domain.string().describe("Domain name to check (with or without extension)")
    },
    async ({ domain }, extra) => {
      try {
        // Handle both cases TLD and without TLD
        if (domain.includes('.')) {
          // Specific domain with TLD
          const result = await apiClient.checkDomainAvailability(domain);
          const text = result.available 
            ? `✅ ${result.domain} is available! ${result.price ? `Price: ${result.price} ${result.currency}` }`
            : `❌ ${result.domain} is not available.`;
          
          return {
            content{ type , text }],
            structuredContent: { 
              domain.domain,
              available.available,
              price.price,
              currency.currency
            }
          };
        } else {
          // Check multiple TLDs
          const results = await apiClient.checkMultipleTLDs(domain);
          const availableDomains = results.filter(r => r.available);
          
          let responseText = `Results for "${domain}":\n\n`;
          
          if (availableDomains.length > 0) {
            responseText += "Available domains:\n";
            availableDomains.forEach(d => {
              responseText += `✅ ${d.domain} ${d.price ? `(${d.price} ${d.currency})` }\n`;
            });
          } else {
            responseText += "No available domains found with common TLDs.\n";
          }
          
          const unavailableDomains = results.filter(r => !r.available);
          responseText += "\nUnavailable domains:\n";
          unavailableDomains.forEach(d => {
            responseText += `❌ ${d.domain}\n`;
          });
          
          return {
            content{ type , text }],
            structuredContent: {
              baseDomain,
              available.map(d => ({ 
                domain.domain, 
                price.price, 
                currency.currency 
              })),
              unavailable.map(d => ({ domain.domain }))
            }
          };
        }
      } catch (error) {
        console.error("Error in check-domain-availability, error);
        return createErrorResponse(error);
      }
    }
  );

  // ====================================
  // Tool Expiring Domains
  // ====================================
  server.tool(
    "search-expiring-domains",
    "Search for domains expiring within 24 hours",
    {
      keyword.string().optional().describe("Optional keyword to filter domains")
    },
    async ({ keyword }, extra) => {
      try {
        // Update cache if expired
        const currentTime = Date.now();
        if (currentTime - lastCacheUpdate > CACHE_TTL || expiringDomainsCache.length === 0) {
          expiringDomainsCache = await apiClient.getExpiringDomains();
          lastCacheUpdate = currentTime;
        }

        const filteredDomains = keyword 
          ? apiClient.searchDomainsByKeyword(expiringDomainsCache, keyword)
          ;
        
        if (filteredDomains.length === 0) {
          return {
            content{
              type ,
              text 
                ? `No expiring domains found matching "${keyword}".` 
                 domains are expiring within the next 24 hours."
            }],
            structuredContent: {
              search: { keyword || null },
              domains,
              total: 0
            }
          };
        }
        
        // Format the results
        let responseText = keyword 
          ? `Domains expiring within 24 hours matching "${keyword}":\n\n`
           expiring within 24 hours:\n\n";
        
        filteredDomains.slice(0, 20).forEach(domain => {
          const expiryDate = new Date(domain.expiryDate);
          responseText += `• ${domain.domain} - Expires: ${expiryDate.toLocaleString()}\n`;
          if (domain.estimatedValue) {
            responseText += `  Estimated Value: $${domain.estimatedValue}\n`;
          }
          if (domain.traffic) {
            responseText += `  Est. Monthly Traffic: ${domain.traffic}\n`;
          }
          if (domain.categories && domain.categories.length > 0) {
            responseText += `  Categories: ${domain.categories.join(', ')}\n`;
          }
          responseText += "\n";
        });
        
        if (filteredDomains.length > 20) {
          responseText += `... and ${filteredDomains.length - 20} more domains.\n`;
        }
        
        return {
          content{ type , text }],
          structuredContent: {
            search: { keyword || null },
            domains,
            total.length,
            showing.min(20, filteredDomains.length)
          }
        };
      } catch (error) {
        console.error("Error in search-expiring-domains, error);
        return createErrorResponse(error);
      }
    }
  );

  // ====================================
  // Tool Expired Domains
  // ====================================
  server.tool(
    "search-expired-domains",
    "Search for recently expired domains",
    {
      keyword.string().optional().describe("Optional keyword to filter domains")
    },
    async ({ keyword }, extra) => {
      try {
        // Update cache if expired
        const currentTime = Date.now();
        if (currentTime - lastCacheUpdate > CACHE_TTL || expiredDomainsCache.length === 0) {
          expiredDomainsCache = await apiClient.getExpiredDomains();
          lastCacheUpdate = currentTime;
        }

        const filteredDomains = keyword 
          ? apiClient.searchDomainsByKeyword(expiredDomainsCache, keyword)
          ;
        
        if (filteredDomains.length === 0) {
          return {
            content{
              type ,
              text 
                ? `No expired domains found matching "${keyword}".` 
                 recently expired domains found."
            }],
            structuredContent: {
              search: { keyword || null },
              domains,
              total: 0
            }
          };
        }
        
        // Format the results
        let responseText = keyword 
          ? `Recently expired domains matching "${keyword}":\n\n`
           expired domains:\n\n";
        
        filteredDomains.slice(0, 20).forEach(domain => {
          const expiryDate = new Date(domain.expiryDate);
          responseText += `• ${domain.domain} - Expired: ${expiryDate.toLocaleString()}\n`;
          if (domain.previousOwner) {
            responseText += `  Previous Owner: ${domain.previousOwner}\n`;
          }
          if (domain.estimatedValue) {
            responseText += `  Estimated Value: $${domain.estimatedValue}\n`;
          }
          if (domain.traffic) {
            responseText += `  Est. Monthly Traffic: ${domain.traffic}\n`;
          }
          if (domain.categories && domain.categories.length > 0) {
            responseText += `  Categories: ${domain.categories.join(', ')}\n`;
          }
          responseText += "\n";
        });
        
        if (filteredDomains.length > 20) {
          responseText += `... and ${filteredDomains.length - 20} more domains.\n`;
        }
        
        return {
          content{ type , text }],
          structuredContent: {
            search: { keyword || null },
            domains,
            total.length,
            showing.min(20, filteredDomains.length)
          }
        };
      } catch (error) {
        console.error("Error in search-expired-domains, error);
        return createErrorResponse(error);
      }
    }
  );
};