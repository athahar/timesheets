#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(TrackPayActivityKitModule, NSObject)

RCT_EXTERN_METHOD(startActivity:(NSString *)sessionId
                  clientId:(NSString *)clientId
                  clientName:(NSString *)clientName
                  startTimeMs:(double)startTimeMs
                  resolver:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

RCT_EXTERN_METHOD(endActivity:(NSString *)sessionId
                  resolver:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

RCT_EXTERN_METHOD(getActiveActivities:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

@end
