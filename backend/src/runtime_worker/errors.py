class WorkerError(RuntimeError):
    retryable = False
    failure_class = "worker_error"


class RetryableWorkerError(WorkerError):
    retryable = True


class ProviderUnavailable(RetryableWorkerError):
    failure_class = "provider_unavailable"


class ProviderTimeout(RetryableWorkerError):
    failure_class = "provider_timeout"


class AdapterProtocolError(WorkerError):
    failure_class = "adapter_protocol"


class OutputPersistenceError(RetryableWorkerError):
    failure_class = "output_persistence"


class CostPersistenceError(RetryableWorkerError):
    failure_class = "cost_persistence"


class StaleLease(WorkerError):
    failure_class = "stale_lease"


class CommitOutcomeUnknown(RetryableWorkerError):
    failure_class = "commit_outcome_unknown"
