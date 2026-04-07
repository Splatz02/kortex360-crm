export type PipelineStage = 
  | 'not_yet_called'
  | 'needs_follow_up'
  | 'pending_projected'
  | 'not_interested'
  | 'interested'
  | 'demo_scheduled'
  | 'closed_collected'

export const PIPELINE_STAGES: { value: PipelineStage; label: string; color: string }[] = [
  { value: 'not_yet_called', label: 'Not Yet Called', color: '#9CA3AF' },
  { value: 'needs_follow_up', label: 'Needs Follow-Up', color: '#F97316' },
  { value: 'pending_projected', label: 'Pending/Projected', color: '#EAB308' },
  { value: 'not_interested', label: 'Not Interested', color: '#EF4444' },
  { value: 'interested', label: 'Interested', color: '#3B82F6' },
  { value: 'demo_scheduled', label: 'Demo Scheduled', color: '#8B5CF6' },
  { value: 'closed_collected', label: 'Closed/Collected', color: '#22C55E' },
]

export const getStageColor = (stage: string): string => {
  const found = PIPELINE_STAGES.find(s => s.value === stage)
  return found?.color || '#9CA3AF'
}

export const getStageLabel = (stage: string): string => {
  const found = PIPELINE_STAGES.find(s => s.value === stage)
  return found?.label || stage
}

export const ICP_STATUSES = ['Hot', 'Warm', 'Cold', 'Nurture'] as const
export type IcpStatus = typeof ICP_STATUSES[number]

export const SERVICE_QUALIFIERS = ['Enterprise', 'SMB', 'Startup', 'Consumer'] as const
export type ServiceQualifier = typeof SERVICE_QUALIFIERS[number]

export const PHONE_TYPES = ['Mobile', 'Landline', 'VoIP', 'Unknown'] as const
export type PhoneType = typeof PHONE_TYPES[number]

export const CONTACT_STATUSES = ['New', 'Contacted', 'Qualified', 'Converted', 'Lost'] as const
export type ContactStatus = typeof CONTACT_STATUSES[number]

export const INTEREST_STATUSES = ['Interested', 'Not Interested', 'Pending', 'Not Yet Asked'] as const
export type InterestStatus = typeof INTEREST_STATUSES[number]

export const SMS_OPT_INS = ['Yes', 'No', 'Pending'] as const
export type SmsOptIn = typeof SMS_OPT_INS[number]

export const FOLLOWUP_TYPES = ['call', 'email', 'meeting', 'demo', 'other'] as const
export type FollowUpType = typeof FOLLOWUP_TYPES[number]

export const FOLLOWUP_STATUSES = ['pending', 'completed', 'snoozed'] as const
export type FollowUpStatus = typeof FOLLOWUP_STATUSES[number]

export const PAYMENT_TYPES = ['payment', 'expense'] as const
export type PaymentType = typeof PAYMENT_TYPES[number]

export const COMMUNICATION_TYPES = ['call', 'sms', 'email', 'note'] as const
export type CommunicationType = typeof COMMUNICATION_TYPES[number]

export const COMMUNICATION_DIRECTIONS = ['inbound', 'outbound'] as const
export type CommunicationDirection = typeof COMMUNICATION_DIRECTIONS[number]