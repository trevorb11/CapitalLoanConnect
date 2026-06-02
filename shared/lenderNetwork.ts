// Lender network — email addresses for deal submission ("shopping")
// Each lender has submission emails (To:) and optional CC addresses + contact info.

export interface LenderContact {
  name: string;
  emails: string[];       // primary submission emails (To:)
  ccEmails?: string[];    // CC addresses
  contactName?: string;
  contactPhone?: string;
  notes?: string;
}

export const LENDER_NETWORK: LenderContact[] = [
  {
    name: "BHB Funding",
    emails: ["ISObiz@bhbfunding.com"],
    ccEmails: ["sabina@bhbfunding.com"],
  },
  {
    name: "Legend Funding",
    emails: ["apps@legendfunding.com"],
    ccEmails: ["dcaro@legendfunding.com"],
    contactName: "David Caro",
    contactPhone: "559-474-5233",
  },
  {
    name: "Capybara USA",
    emails: ["deals@capybarausa.com"],
    ccEmails: ["cbianco@capybarausa.com"],
    contactPhone: "561-404-1674",
  },
  {
    name: "Lite Fund",
    emails: ["deals@litefund.co"],
    ccEmails: ["aron@litefund.co", "frank@litefund.co"],
  },
  {
    name: "Likety",
    emails: ["funding@likety.com"],
    ccEmails: ["ray@likety.com"],
    notes: "Old submissions: submissions@likety.com | Status/conditions: underwriting@likety.com",
  },
  {
    name: "Rapid Finance",
    emails: [],
    notes: "Portal-based: https://login.rapidfinance.com — submit via portal, not email",
  },
  {
    name: "River Advance",
    emails: ["iso@riveradvance.com"],
    ccEmails: ["Eli@riveradvance.com", "Sarah@riveradvance.com"],
  },
  {
    name: "Westwood Funding",
    emails: ["Masoncap@westwoodfunding.com"],
    contactName: "Juan Monegro",
    contactPhone: "954-350-0331 ext 1032",
  },
  {
    name: "Fuji Funding",
    emails: ["michael@fujifunding.com"],
    contactName: "Michael",
    contactPhone: "847-606-1979",
  },
  {
    name: "TVT Capital",
    emails: ["MKAROW@TVTCAPITAL.COM"],
    ccEmails: ["AFELLUS@TVTCAPITAL.COM"],
  },
  {
    name: "Kapitus",
    emails: ["newcontracts@kapitus.com"],
    ccEmails: ["teambyler@kapitus.com"],
    contactName: "Braden Byler",
    contactPhone: "(814) 602-0991",
    notes: "Allysa: 863-370-4569",
  },
  {
    name: "Fenix Capital Funding",
    emails: ["newdeals@fenixcapitalfunding.com"],
    ccEmails: ["olegz@fenixcapitalfunding.com"],
  },
  {
    name: "The Fund Works",
    emails: ["newdeals@thefundworks.com"],
    ccEmails: ["cweiner@thefundworks.com"],
  },
  {
    name: "Backd",
    emails: ["submissions@backd.com"],
    ccEmails: ["vy@backd.com"],
  },
  {
    name: "DLP Funding",
    emails: ["submissions@dlpfunding.com"],
  },
  {
    name: "Fintegra",
    emails: ["Submissions@getfintegra.com"],
    ccEmails: ["samanthai@getfintegra.com"],
  },
  {
    name: "PIRS Capital",
    emails: ["Submissions@pirscapital.com"],
    ccEmails: ["Mitchell@pirscapital.com"],
  },
  {
    name: "Silverline Funding",
    emails: ["submissions@silverlinefunding.com"],
  },
  {
    name: "Specialty Capital",
    emails: ["Submissions@specialtycapital.com"],
    ccEmails: ["Michael@specialtycapital.com"],
    contactName: "Michael",
    contactPhone: "+1 (917) 651 4613",
  },
  {
    name: "Super Fast Cap",
    emails: ["submissions@superfastcap.com"],
    ccEmails: ["ertjon@superfastcap.com"],
  },
  {
    name: "The Smarter Merchant",
    emails: ["submissions@thesmartermerchant.com"],
    ccEmails: ["Lena@thesmartermerchant.com"],
    contactPhone: "646-241-1484",
  },
  {
    name: "Top Choice Financial",
    emails: ["submissions@topchoicefinancial.com"],
    ccEmails: ["Kimberly@topchoicefinancial.com"],
  },
  {
    name: "Vital Cap Fund",
    emails: ["submissions@vitalcapfund.com"],
    ccEmails: ["pooja.nene@vitalcapfund.com"],
  },
  {
    name: "Vox Funding",
    emails: ["submissions@voxfunding.com"],
    ccEmails: ["nvarner@voxfunding.com"],
    notes: "For deals 150k+, also CC jscavuzzo@voxfunding.com",
  },
  {
    name: "I Got Funded",
    emails: ["Submit@i-gotfunded.com"],
    ccEmails: ["viviana@i-gotfunded.com"],
  },
  {
    name: "Smart Business Funder",
    emails: ["Submit@SmartBusinessFunder.com"],
    contactName: "Anthony Colin",
    contactPhone: "917-533-2979",
  },
  {
    name: "Pearl Cash",
    emails: ["submitpearl@pearlcash.com"],
    ccEmails: ["brett.spass@revenued.com"],
  },
  {
    name: "Revenued",
    emails: ["submitrevenued@revenued.com"],
    ccEmails: ["brett.spass@revenued.com"],
    contactPhone: "908-400-2740",
  },
  {
    name: "Capitalize Group",
    emails: ["subs@capitalizegroup.com"],
    ccEmails: ["isaac@capitalizegroup.com"],
  },
  {
    name: "Radiance Funding",
    emails: ["Subs@RadianceFunding.com"],
    ccEmails: ["Simon@radiancefunding.com"],
  },
  {
    name: "Velocity CG",
    emails: ["Subs@velocitycg.com"],
    ccEmails: ["carlosbrown@velocitycg.com"],
    contactPhone: "516-784-7115",
  },
  {
    name: "Evolve Capital Finance",
    emails: ["tony@evolvecapitalfinance.com"],
  },
  {
    name: "American Financial Center",
    emails: ["underwriting@afincen.com"],
    ccEmails: ["markc@afincen.com"],
    contactPhone: "818-981-1034",
  },
  {
    name: "BizPoint Capital",
    emails: ["underwriting@bizpointcapital.com"],
  },
  {
    name: "Fox Business Funding",
    emails: ["Underwriting@foxbusinessfunding.com"],
    ccEmails: ["avner@foxbusinessfunding.com"],
  },
  {
    name: "UF Capital Experts / EZ Revenue",
    emails: ["underwriting@ufcapitalexperts.com"],
    ccEmails: ["Matt@ezrevenuefinance.com"],
  },
];
